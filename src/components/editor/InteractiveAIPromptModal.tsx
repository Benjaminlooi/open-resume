import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

import { streamText } from "ai";
import { Check, Loader2, Send, Sparkles, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { useSettingsStore, type AIProvider } from "#/lib/settings-store";
import { cn } from "#/lib/utils";

interface Props {
	context: Record<string, any>;
	onApply: (html: string) => void;
	children?: React.ReactNode;
}

const suggestions = [
	{
		label: "✨ Quantify impact",
		prompt:
			"Make my bullet points more quantifiable with numbers and metrics.",
	},
	{
		label: "✍️ Use action verbs",
		prompt: "Improve my bullet points using stronger action verbs.",
	},
	{
		label: "📏 Shorten bullets",
		prompt: "Make these bullet points more concise and impactful.",
	},
	{
		label: "🎯 Tailor for role",
		prompt:
			"Tailor these bullet points specifically for the role mentioned in the context.",
	},
];

export function InteractiveAIPromptModal({
	context,
	onApply,
	children,
}: Props) {
	const [open, setOpen] = useState(false);
	const { defaultProvider, apiKeys, baseUrls, selectedModels } =
		useSettingsStore();
	const [selectedProvider, setSelectedProvider] =
		useState<AIProvider>(defaultProvider);

	const [messages, setMessages] = useState<any[]>([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [abortController, setAbortController] =
		useState<AbortController | null>(null);

	const isLocal =
		selectedProvider === "ollama" || selectedProvider === "lmstudio";
	const apiKey = isLocal ? "dummy" : apiKeys[selectedProvider];
	const baseUrl = baseUrls[selectedProvider];
	const modelName = selectedModels[selectedProvider];

	const chatEndRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const handleStop = () => {
		abortController?.abort();
		setAbortController(null);
		setIsLoading(false);
	};

	const handleSubmit = async (e?: React.FormEvent, overrideInput?: string) => {
		e?.preventDefault();
		const messageContent = overrideInput || input;
		if (!messageContent.trim() || isLoading) return;

		const userMessage = { role: "user", content: messageContent };
		setMessages((prev) => [...prev, userMessage]);
		setInput("");
		setIsLoading(true);
		setError(null);

		const controller = new AbortController();
		setAbortController(controller);

		let model;
		switch (selectedProvider) {
			case "openai":
				model = createOpenAI({ apiKey })("gpt-4o-mini");
				break;
			case "anthropic":
				model = createAnthropic({ apiKey })("claude-3-5-haiku-latest");
				break;
			case "google":
				model = createGoogleGenerativeAI({ apiKey })("gemini-1.5-flash");
				break;
			case "deepseek":
				model = createOpenAI({
					apiKey,
					baseURL: "https://api.deepseek.com/v1",
				})("deepseek-chat");
				break;
			case "groq":
				model = createOpenAI({
					apiKey,
					baseURL: "https://api.groq.com/openai/v1",
				})("llama3-8b-8192");
				break;
			case "ollama":
			case "lmstudio":
				if (!baseUrl || !modelName) {
					setError("Base URL and Model required.");
					setIsLoading(false);
					return;
				}
				model = createOpenAI({ apiKey: "dummy-key", baseURL: baseUrl })(
					modelName,
				);
				break;
			default:
				setError("Unsupported provider");
				setIsLoading(false);
				return;
		}

		if (!apiKey && !isLocal) {
			setError("No API key configured.");
			setIsLoading(false);
			return;
		}

		try {
			// Map our internal messages format to Vercel AI SDK CoreMessage format
			const coreMessages = messages.flatMap((m) => {
				if (m.role === "user") return { role: "user", content: m.content };

				if (m.role === "assistant") {
					const parts: any[] = [];
					if (m.content) parts.push({ type: "text", text: m.content });

					if (m._toolCalls && m._toolCalls.length > 0) {
						m._toolCalls.forEach((tc: any) => {
							parts.push({
								type: "tool-call",
								toolCallId: tc.toolCallId,
								toolName: tc.toolName,
								args: tc.args,
							});
						});
					}

					const msgs: any[] = [{ role: "assistant", content: parts }];

					// If there were tool calls, we must provide the tool results in the next message
					if (m._toolCalls && m._toolCalls.length > 0) {
						const resultParts = m._toolCalls.map((tc: any) => ({
							type: "tool-result",
							toolCallId: tc.toolCallId,
							toolName: tc.toolName,
							result: tc.args, // We just reflect the args as the result
						}));
						msgs.push({ role: "tool", content: resultParts });
					}

					return msgs;
				}
				return m;
			});

			const systemPrompt = `You are an expert resume writer. 
The user is updating their resume for the following context:
${JSON.stringify(context, null, 2)}

Help them write impressive, quantifiable bullet points. 
You MUST use the propose_resume_update tool to suggest bullet points.`;

			const result = streamText({
				model,
				system: systemPrompt,
				messages: [...coreMessages, userMessage],
				abortSignal: controller.signal,
				tools: {
					propose_resume_update: {
						description: "Propose a new set of resume bullet points.",
						inputSchema: z.object({
							bullets: z
								.array(z.string())
								.describe(
									"An array of proposed resume bullet points. Each string should be a single bullet point. Do not include HTML tags.",
								),
						}),
						execute: async ({ bullets }: { bullets: string[] }) => {
							return { bullets };
						},
					},
				},
			});

			let fullText = "";
			const assistantMessageIndex = messages.length + 1; // +1 for the new user message
			setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

			for await (const chunk of result.textStream) {
				fullText += chunk;
				setMessages((prev) => {
					const newMessages = [...prev];
					newMessages[assistantMessageIndex] = {
						role: "assistant",
						content: fullText,
					};
					return newMessages;
				});
			}

			const calls = await result.toolCalls;
			if (calls && calls.length > 0) {
				setMessages((prev) => {
					const newMessages = [...prev];
					// @ts-ignore - appending custom tool data to render later
					newMessages[assistantMessageIndex] = {
						...newMessages[assistantMessageIndex],
						_toolCalls: calls,
					};
					return newMessages;
				});
			}
		} catch (err: any) {
			if (err.name === "AbortError") {
				return;
			}
			setError(err.message);
		} finally {
			setIsLoading(false);
			setAbortController(null);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="neutral" size="sm" className="h-8 gap-2">
					<Sparkles className="size-4" />
					Generate with AI
				</Button>
			</DialogTrigger>
			<DialogContent className="w-7xl max-w-7xl h-[80vh] flex flex-col p-0 overflow-hidden">
				<DialogHeader className="px-6 py-4 border-b shrink-0">
					<DialogTitle>Improve with AI</DialogTitle>
					<div className="flex items-center gap-2 mt-2">
						<span className="text-sm font-medium">Provider:</span>
						<Select
							value={selectedProvider}
							onValueChange={(val) => setSelectedProvider(val as AIProvider)}
						>
							<SelectTrigger className="w-[180px] h-8">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="openai">OpenAI</SelectItem>
								<SelectItem value="anthropic">Anthropic</SelectItem>
								<SelectItem value="google">Google</SelectItem>
								<SelectItem value="deepseek">DeepSeek</SelectItem>
								<SelectItem value="groq">Groq</SelectItem>
								<SelectItem value="ollama">Ollama</SelectItem>
								<SelectItem value="lmstudio">LM Studio</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</DialogHeader>

				<div className="flex flex-1 overflow-hidden">
					{/* Left Pane: Current State */}
					<div className="w-1/2 border-r p-6 overflow-y-auto flex flex-col gap-4 bg-muted/20">
						{children}
					</div>

					{/* Right Pane: Chat */}
					<div className="w-1/2 flex flex-col bg-white">
						<div className="flex-1 overflow-y-auto p-4 space-y-4">
							{messages.length === 0 && (
								<div className="text-center text-muted-foreground mt-10">
									Ask the AI to generate or improve your bullet points!
								</div>
							)}
							{messages.map((m: any, i) => (
								<div
									key={i}
									className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
								>
									<div
										className={cn(
											"max-w-[85%] p-3 text-sm shadow-sm",
											m.role === "user"
												? "bg-primary text-primary-foreground rounded-2xl rounded-tr-none"
												: "bg-muted text-foreground rounded-2xl rounded-tl-none",
										)}
									>
										{typeof m.content === "string" && m.content}
										{m._toolCalls?.map((tool: any) => {
											if (
												tool.toolName === "propose_resume_update" &&
												tool.args
											) {
												return (
													<div
														key={tool.toolCallId}
														className="mt-3 p-3 bg-background border rounded-md text-foreground"
													>
														<div className="font-medium text-sm mb-2 pb-2 border-b">
															Proposed Update:
														</div>
														<div className="text-sm mb-3">
															<ul className="list-disc pl-5 space-y-1">
																{tool.args.bullets?.map(
																	(b: string, idx: number) => (
																		<li key={idx}>{b}</li>
																	),
																)}
															</ul>
														</div>
														<Button
															size="sm"
															className="w-full gap-2"
															onClick={() => {
																const html = `<ul>${tool.args.bullets?.map((b: string) => `<li>${b}</li>`).join("")}</ul>`;
																onApply(html);
																setOpen(false);
															}}
														>
															<Check className="size-4" /> Apply Changes
														</Button>
													</div>
												);
											}
											return null;
										})}
									</div>
								</div>
							))}
							{isLoading && (
								<div className="space-y-2">
									<div className="text-muted-foreground flex gap-2 items-center">
										<Loader2 className="size-4 animate-spin" /> AI is
										thinking...
									</div>
									<div className="flex justify-center p-2">
										<Button
											variant="neutral"
											size="sm"
											onClick={handleStop}
											className="gap-2 text-xs"
										>
											<Square className="size-3 fill-current" /> Stop generating
										</Button>
									</div>
								</div>
							)}
							{error && (
								<div className="text-red-500 bg-red-100 p-2 rounded">
									Error: {error}
								</div>
							)}
							<div ref={chatEndRef} />
						</div>

						<div className="flex gap-2 p-2 overflow-x-auto no-scrollbar border-t">
							{suggestions.map((s) => (
								<Button
									key={s.label}
									variant="neutral"
									size="sm"
									className="rounded-full whitespace-nowrap text-xs h-7"
									onClick={() => handleSubmit(undefined, s.prompt)}
									disabled={isLoading}
								>
									{s.label}
								</Button>
							))}
						</div>
						<form
							onSubmit={handleSubmit}
							className="p-4 border-t shrink-0 flex gap-2"
						>
							<Textarea
								value={input}
								onChange={(e) => setInput(e.target.value)}
								placeholder="e.g. Focus on my leadership skills..."
								className="min-h-[60px] resize-none"
								onKeyDown={(e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault();
										handleSubmit(e);
									}
								}}
							/>
							<Button
								type="submit"
								disabled={isLoading || !input.trim()}
								className="h-auto"
							>
								<Send className="size-4" />
							</Button>
						</form>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
