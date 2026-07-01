import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	getAIConfig,
	updateAIConfig,
} from "#/lib/local-backend-client";
import type {
	AIConfigResponse,
	UpdateAiConfigRequest,
} from "#/lib/local-backend-client";
import {
	type AIProvider,
	providerDisplayNames,
	providerDefaultModels,
	CLOUD_PROVIDERS,
} from "@open-resume/contracts";

export const Route = createFileRoute("/_app/settings")({
	component: AISettingsPage,
});

const PROVIDER_LIST: AIProvider[] = [
	"openai",
	"anthropic",
	"google",
	"deepseek",
	"groq",
	"ollama",
	"lmstudio",
];

function AISettingsPage() {
	const [config, setConfig] = useState<AIConfigResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	// Form state
	const [provider, setProvider] = useState<AIProvider>("openai");
	const [apiKey, setApiKey] = useState("");
	const [modelName, setModelName] = useState("");
	const [baseUrl, setBaseUrl] = useState("");

	const isCloudProvider = CLOUD_PROVIDERS.includes(provider);

	const loadConfig = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const cfg = await getAIConfig();
			setConfig(cfg);
			setProvider(cfg.provider);
			setModelName(cfg.modelName);
			setBaseUrl(cfg.baseUrl ?? "");
			// Don't set apiKey from masked response — leave empty
			setApiKey("");
		} catch (e: any) {
			setError(
				e.message.includes("not reachable")
					? "Backend is not running. Start it with pnpm backend:dev."
					: e.message,
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadConfig();
	}, [loadConfig]);

	const handleProviderChange = (newProvider: AIProvider) => {
		setProvider(newProvider);
		setModelName(providerDefaultModels[newProvider]);
		setApiKey("");
		setBaseUrl("");
		setSuccess(false);
	};

	const handleSave = async () => {
		if (isCloudProvider && !apiKey && !config?.hasApiKey) {
			setError("API key is required for cloud providers.");
			return;
		}

		setSaving(true);
		setError(null);
		setSuccess(false);

		try {
			const update: UpdateAiConfigRequest = {
				provider,
				modelName,
			};
			// Only send apiKey if the user typed something (not empty)
			if (apiKey) {
				update.apiKey = apiKey;
			}
			if (!isCloudProvider) {
				update.baseUrl = baseUrl;
			}
			const result = await updateAIConfig(update);
			setConfig(result);
			setApiKey("");
			setSuccess(true);
			setTimeout(() => setSuccess(false), 3000);
		} catch (e: any) {
			setError(e.message);
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="mx-auto max-w-[1300px] p-8">
				<div className="flex items-center gap-3 text-muted-foreground">
					<Loader2 className="size-5 animate-spin" />
					<span>Loading AI settings...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-[1300px] p-8">
			<div className="mb-8">
				<h1 className="font-heading text-3xl font-bold">AI Settings</h1>
				<p className="mt-2 text-muted-foreground">
					Configure your AI provider for job analysis, resume tailoring, and cover
					letter generation.
				</p>
			</div>

			{error && (
				<div className="mb-6 flex items-start gap-3 rounded-base border-2 border-border bg-red-50 p-4 shadow-light">
					<AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
					<p className="text-sm font-medium text-red-800">{error}</p>
				</div>
			)}

			{success && (
				<div className="mb-6 flex items-start gap-3 rounded-base border-2 border-border bg-green-50 p-4 shadow-light">
					<CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" />
					<p className="text-sm font-medium text-green-800">
						Settings saved successfully.
					</p>
				</div>
			)}

			<div className="rounded-base border-2 border-border bg-secondary-background p-6 shadow-shadow">
				<div className="grid gap-6">
					{/* Provider Selection */}
					<div className="grid gap-2">
						<Label htmlFor="provider" className="font-heading text-sm font-bold">
							Provider
						</Label>
						<Select value={provider} onValueChange={handleProviderChange}>
							<SelectTrigger id="provider">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{PROVIDER_LIST.map((p) => (
									<SelectItem key={p} value={p}>
										{providerDisplayNames[p]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							{isCloudProvider
								? "Cloud provider — requires an API key."
								: "Local provider — runs on your machine, no API key needed."}
						</p>
					</div>

					{/* API Key (cloud providers only) */}
					{isCloudProvider && (
						<div className="grid gap-2">
							<Label htmlFor="apiKey" className="font-heading text-sm font-bold">
								API Key
							</Label>
							<Input
								id="apiKey"
								type="password"
								placeholder={
									config?.hasApiKey
										? "Enter new key to replace existing"
										: `Enter your ${providerDisplayNames[provider]} API key`
								}
								value={apiKey}
								onChange={(e) => {
									setApiKey(e.target.value);
									setSuccess(false);
								}}
							/>
							{config?.hasApiKey && !apiKey && (
								<p className="text-xs text-muted-foreground">
									A key is configured ({config.apiKeyMasked}). Leave empty to
									keep it.
								</p>
							)}
						</div>
					)}

					{/* Base URL (local providers only) */}
					{!isCloudProvider && (
						<div className="grid gap-2">
							<Label htmlFor="baseUrl" className="font-heading text-sm font-bold">
								Base URL
							</Label>
							<Input
								id="baseUrl"
								type="text"
								placeholder={
									provider === "ollama"
										? "http://localhost:11434/v1"
										: "http://localhost:1234/v1"
								}
								value={baseUrl}
								onChange={(e) => {
									setBaseUrl(e.target.value);
									setSuccess(false);
								}}
							/>
							<p className="text-xs text-muted-foreground">
								The local server address for{" "}
								{providerDisplayNames[provider]}.
							</p>
						</div>
					)}

					{/* Model Name */}
					<div className="grid gap-2">
						<Label htmlFor="modelName" className="font-heading text-sm font-bold">
							Model
						</Label>
						<Input
							id="modelName"
							type="text"
							placeholder={providerDefaultModels[provider]}
							value={modelName}
							onChange={(e) => {
								setModelName(e.target.value);
								setSuccess(false);
							}}
						/>
						<p className="text-xs text-muted-foreground">
							Default: {providerDefaultModels[provider]}
						</p>
					</div>

					{/* Save Button */}
					<div className="flex justify-end pt-2">
						<Button
							onClick={handleSave}
							disabled={saving}
							className="gap-2"
						>
							{saving ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Save className="size-4" />
							)}
							Save Changes
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
