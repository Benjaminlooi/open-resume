import { Loader2, Settings } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import {
	type AIProvider,
	useSettingsStore,
} from "#/lib/settings-store";

const PROVIDERS: { id: AIProvider; name: string; isLocal?: boolean; defaultUrl?: string }[] = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "google", name: "Google (Gemini)" },
  { id: "deepseek", name: "DeepSeek" },
  { id: "groq", name: "Groq" },
  { id: "ollama", name: "Ollama", isLocal: true, defaultUrl: "http://localhost:11434/v1" },
  { id: "lmstudio", name: "LM Studio", isLocal: true, defaultUrl: "http://localhost:1234/v1" },
];

export function GlobalSettingsModal() {
  const {
  	apiKeys,
  	defaultProvider,
  	baseUrls,
  	selectedModels,
  	updateAPIKey,
  	setDefaultProvider,
  	updateBaseUrl,
  	updateSelectedModel,
  } = useSettingsStore();

		const [isFetching, setIsFetching] = useState(false);
		const [fetchError, setFetchError] = useState<string | null>(null);
		const [availableModels, setAvailableModels] = useState<string[]>([]);

		const handleFetchModels = async (provider: AIProvider, url: string) => {
			setIsFetching(true);
			setFetchError(null);
			try {
				const response = await fetch(`${url}/models`);
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				const data = await response.json();
				if (data && data.data && Array.isArray(data.data)) {
					setAvailableModels(data.data.map((m: any) => m.id));
				} else {
					throw new Error("Invalid response format from models endpoint.");
				}
			} catch (err: any) {
				console.error(err);
				setFetchError(
					"Failed to fetch models. Check if the server is running and CORS is enabled.",
				);
			} finally {
				setIsFetching(false);
			}
		};

		return (
			<Dialog>
				<DialogTrigger asChild>
					<Button variant="neutral" size="icon" className="h-10 w-10">
						<Settings className="size-5" />
						<span className="sr-only">Settings</span>
					</Button>
				</DialogTrigger>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Settings</DialogTitle>
						<DialogDescription>
							Configure your AI providers. API keys and URLs are stored locally
							in your browser.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4 -mx-6 px-6 max-h-[70vh] overflow-y-auto">
						<div className="grid gap-2">
							<Label htmlFor="default-provider">Default Provider</Label>
							<Select
								value={defaultProvider}
								onValueChange={(val) => setDefaultProvider(val as AIProvider)}
							>
								<SelectTrigger id="default-provider">
									<SelectValue placeholder="Select provider" />
								</SelectTrigger>
								<SelectContent>
									{PROVIDERS.map((p) => (
										<SelectItem key={p.id} value={p.id}>
											{p.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="grid gap-4 pt-4 border-t-2 border-border">
							<h4 className="font-heading text-sm font-bold">
								Provider Configuration
							</h4>
							{PROVIDERS.map((p) => {
								if (p.isLocal) {
									const currentUrl = baseUrls[p.id] || p.defaultUrl || "";
									return (
										<div
											key={p.id}
											className="grid gap-2 border p-3 rounded-md"
										>
											<Label className="font-bold">{p.name}</Label>
											<div className="grid gap-1">
												<Label htmlFor={`url-${p.id}`} className="text-xs">
													Base URL
												</Label>
												<Input
													id={`url-${p.id}`}
													placeholder={`e.g. ${p.defaultUrl}`}
													value={
														baseUrls[p.id] !== undefined
															? baseUrls[p.id]
															: p.defaultUrl || ""
													}
													onChange={(e) => updateBaseUrl(p.id, e.target.value)}
												/>
											</div>
											<div className="flex flex-col gap-2 items-start mt-2">
												<Button
													size="sm"
													variant="neutral"
													onClick={() => handleFetchModels(p.id, currentUrl)}
													disabled={isFetching}
												>
													{isFetching && (
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													)}
													Fetch Models
												</Button>
												{fetchError && (
													<p className="text-xs text-red-500 font-medium">
														{fetchError}
													</p>
												)}
												<p className="text-[10px] text-muted-foreground">
													Requires CORS enabled on your local instance.
												</p>
											</div>
											{(availableModels.length > 0 || selectedModels[p.id]) && (
												<div className="grid gap-1 mt-2">
													<Label htmlFor={`model-${p.id}`} className="text-xs">
														Selected Model
													</Label>
													<Select
														value={selectedModels[p.id] || ""}
														onValueChange={(val) =>
															updateSelectedModel(p.id, val)
														}
													>
														<SelectTrigger id={`model-${p.id}`}>
															<SelectValue placeholder="Select a model" />
														</SelectTrigger>
														<SelectContent>
															{availableModels.map((m) => (
																<SelectItem key={m} value={m}>
																	{m}
																</SelectItem>
															))}
															{!availableModels.includes(
																selectedModels[p.id] || "",
															) &&
																selectedModels[p.id] && (
																	<SelectItem
																		value={selectedModels[p.id] as string}
																	>
																		{selectedModels[p.id]}
																	</SelectItem>
																)}
														</SelectContent>
													</Select>
												</div>
											)}
										</div>
									);
								}

								return (
									<div key={p.id} className="grid gap-1">
										<Label htmlFor={`key-${p.id}`} className="text-xs">
											{p.name} API Key
										</Label>
										<Input
											id={`key-${p.id}`}
											type="password"
											placeholder={`Enter ${p.name} API Key`}
											value={apiKeys[p.id] || ""}
											onChange={(e) => updateAPIKey(p.id, e.target.value)}
										/>
									</div>
								);
							})}
						</div>
					</div>
				</DialogContent>
			</Dialog>
		);
}
