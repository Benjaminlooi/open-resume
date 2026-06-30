import DOMPurify from "isomorphic-dompurify";
import { Check, Loader2, Send, Sparkles, Square } from "lucide-react";
import { marked } from "marked";
import { useEffect, useRef } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Textarea } from "#/components/ui/textarea";
import { useShallow } from "zustand/react/shallow";
import { type Message, useRootStore } from "#/lib/root-store";
import { cn } from "#/lib/utils";
import { backendBaseUrl } from "#/lib/local-backend-client";

interface Props {
	context: Record<string, unknown>;
	onApply: (html: string) => void;
	children?: React.ReactNode;
}

const suggestions = [
	{
		label: "✨ Quantify impact",
		prompt: "Make my bullet points more quantifiable with numbers and metrics.",
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
	const {
		isOpen,
		setIsOpen,
		messages,
		setMessages,
		input,
		setInput,
		isLoading,
		setIsLoading,
		error,
		setError,
		abortController,
		setAbortController,
	} = useRootStore(useShallow((s) => s.ai));

	const chatEndRef = useRef<HTMLDivElement>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: We want to scroll whenever messages change
	useEffect(() => {
		chatEndRef.current?.scrollIntoView({ behavior: "auto" });
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

		const userMessage: Message = { role: "user", content: messageContent };
		setMessages((prev) => [...prev, userMessage]);
		setInput("");
		setIsLoading(true);
		setError(null);

		const controller = new AbortController();
		setAbortController(controller);

		try {
			// Map our internal messages format to Vercel AI SDK CoreMessage format
			const coreMessages = messages.flatMap((m) => {
				if (m.role === "user")
					return { role: "user" as const, content: m.content as string };

				if (m.role === "assistant") {
					const parts: any[] = [];
					if (typeof m.content === "string") {
						parts.push({ type: "text", text: m.content });
					}

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

					const content =
						parts.length > 0 ? parts : (m.content as string) || "";
					const msgs: any[] = [{ role: "assistant", content }];

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
				return m as any;
			});

			const response = await fetch(`${backendBaseUrl}/ai/chat`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					messages: [...coreMessages, { role: "user", content: messageContent }],
					context,
				}),
				signal: controller.signal,
			});

			if (!response.ok) {
				const errText = await response.text();
				throw new Error(errText || "Chat generation failed");
			}

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error("Failed to get stream reader");
			}

			const decoder = new TextDecoder();
			let buffer = "";

			const assistantMessageIndex = messages.length + 1; // +1 for the new user message
			setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n\n");
				// Keep the last partial line in the buffer
				buffer = lines.pop() || "";

				for (const line of lines) {
					if (!line.startsWith("data: ")) continue;
					const jsonStr = line.slice(6);
					try {
						const part = JSON.parse(jsonStr);
						if (part.type === "text-delta" && part.textDelta) {
							setMessages((prev) => {
								const newMessages = [...prev];
								const current = newMessages[assistantMessageIndex];
								newMessages[assistantMessageIndex] = {
									...current,
									content: (current.content as string) + part.textDelta,
								};
								return newMessages;
							});
						} else if (part.type === "tool-call" && part.toolName === "propose_resume_update") {
							setMessages((prev) => {
								const newMessages = [...prev];
								const current = newMessages[assistantMessageIndex];
								const existingCalls = current._toolCalls || [];
								newMessages[assistantMessageIndex] = {
									...current,
									_toolCalls: [...existingCalls, part],
								};
								return newMessages;
							});
						}
					} catch (e) {
						console.error("Failed to parse SSE line", e);
					}
				}
			}
		} catch (err: any) {
			if (err.name === "AbortError") {
				return;
			}
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setIsLoading(false);
			setAbortController(null);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="neutral" size="sm" className="h-8 gap-2">
					<Sparkles className="size-4" />
					Generate with AI
				</Button>
			</DialogTrigger>
			<DialogContent className="w-7xl max-w-7xl h-[80vh] flex flex-col p-0 overflow-hidden">
				<DialogHeader className="px-6 py-4 border-b shrink-0">
					<DialogTitle>Improve with AI</DialogTitle>
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
								<div className="flex flex-col items-center justify-center h-full text-center p-8">
									<div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
										<Sparkles className="size-6 text-primary" />
									</div>
									<h3 className="font-semibold text-lg mb-2">
										AI Writing Assistant
									</h3>
									<p className="text-sm text-muted-foreground mb-6 max-w-sm">
										Chat with the AI resume coach to draft and refine your
										bullet points. Once you are happy with the suggestions, ask
										the AI to apply them!
									</p>
								</div>
							)}
							{messages.map((m, i) => (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: order is stable
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
										{typeof m.content === "string" && (
											<div
												className={cn(
													"prose prose-sm max-w-none text-current prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-ul:ml-4 prose-ol:my-1 prose-ol:ml-4 prose-a:text-current prose-strong:text-current prose-strong:font-semibold prose-code:text-current",
													m.role === "user" ? "prose-invert" : "",
												)}
												// biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized with DOMPurify
												dangerouslySetInnerHTML={{
													__html: DOMPurify.sanitize(
														marked.parse(m.content as string) as string,
													),
												}}
											/>
										)}
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
																		// biome-ignore lint/suspicious/noArrayIndexKey: order is stable
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
																setIsOpen(false);
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
