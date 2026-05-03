import { useStore } from "@tanstack/react-store";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { Loader2, Sparkles, Send, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { type AIProvider, settingsStore } from "#/lib/settings-store";

interface Props {
  role: string;
  company: string;
  currentDescription: string;
  onApply: (html: string) => void;
}

export function InteractiveAIPromptModal({ role, company, currentDescription, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const { defaultProvider, apiKeys, baseUrls, selectedModels } = useStore(settingsStore);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(defaultProvider);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLocal = selectedProvider === "ollama" || selectedProvider === "lmstudio";
  const apiKey = isLocal ? "dummy" : apiKeys[selectedProvider];
  const baseUrl = baseUrls[selectedProvider];
  const modelName = selectedModels[selectedProvider];

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    let model;
    switch (selectedProvider) {
      case "openai": model = createOpenAI({ apiKey })("gpt-4o-mini"); break;
      case "anthropic": model = createAnthropic({ apiKey })("claude-3-5-haiku-latest"); break;
      case "google": model = createGoogleGenerativeAI({ apiKey })("gemini-1.5-flash"); break;
      case "deepseek": model = createOpenAI({ apiKey, baseURL: "https://api.deepseek.com/v1" })("deepseek-chat"); break;
      case "groq": model = createOpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" })("llama3-8b-8192"); break;
      case "ollama":
      case "lmstudio":
        if (!baseUrl || !modelName) {
           setError("Base URL and Model required.");
           setIsLoading(false);
           return;
        }
        model = createOpenAI({ apiKey: "dummy-key", baseURL: baseUrl })(modelName);
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
      const result = streamText({
        model,
        system: `You are an expert resume writer. The user is updating their resume for the role of ${role} at ${company}. Help them write impressive, quantifiable bullet points. You MUST use the propose_resume_update tool to suggest bullet points.`,
        messages: [...messages, userMessage],
        tools: {
          propose_resume_update: {
            description: 'Propose a new set of resume bullet points as an HTML string with <ul> and <li> tags.',
            inputSchema: z.object({
              bulletsHtml: z.string().describe('The proposed bullet points formatted exactly as HTML <ul><li>...</li></ul>'),
            }),
            execute: async ({ bulletsHtml }: { bulletsHtml: string }) => {
              return { bulletsHtml };
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
            newMessages[assistantMessageIndex] = { role: "assistant", content: fullText };
            return newMessages;
         });
      }
      
      const calls = await result.toolCalls;
      if (calls && calls.length > 0) {
        setMessages((prev) => {
            const newMessages = [...prev];
            // @ts-ignore - appending custom tool data to render later
            newMessages[assistantMessageIndex] = { ...newMessages[assistantMessageIndex], _toolCalls: calls };
            return newMessages;
        });
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="neutral" size="sm" className="h-8 gap-2"><Sparkles className="size-4" />Generate with AI</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Improve with AI</DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-medium">Provider:</span>
            <Select value={selectedProvider} onValueChange={(val) => setSelectedProvider(val as AIProvider)}>
              <SelectTrigger className="w-[180px] h-8"><SelectValue /></SelectTrigger>
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
            <div>
              <h3 className="font-semibold text-lg">{role || "Role"}</h3>
              <p className="text-muted-foreground">{company || "Company"}</p>
            </div>
            <div className="bg-white p-4 rounded-md border min-h-[200px]" dangerouslySetInnerHTML={{ __html: currentDescription || "<em>No description yet...</em>" }} />
          </div>

          {/* Right Pane: Chat */}
          <div className="w-1/2 flex flex-col bg-white">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground mt-10">Ask the AI to generate or improve your bullet points!</div>
              )}
              {messages.map((m: any, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-lg ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {typeof m.content === 'string' && m.content}
                    {m._toolCalls?.map((tool: any) => {
                      if (tool.toolName === 'propose_resume_update' && tool.args) {
                        return (
                          <div key={tool.toolCallId} className="mt-3 p-3 bg-background border rounded-md text-foreground">
                            <div className="font-medium text-sm mb-2 pb-2 border-b">Proposed Update:</div>
                            <div className="text-sm mb-3" dangerouslySetInnerHTML={{ __html: tool.args.bulletsHtml }} />
                            <Button size="sm" className="w-full gap-2" onClick={() => { onApply(tool.args.bulletsHtml); setOpen(false); }}>
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
              {isLoading && <div className="text-muted-foreground flex gap-2 items-center"><Loader2 className="size-4 animate-spin" /> AI is thinking...</div>}
              {error && <div className="text-red-500 bg-red-100 p-2 rounded">Error: {error}</div>}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t shrink-0 flex gap-2">
              <Textarea 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder="e.g. Focus on my leadership skills..." 
                className="min-h-[60px] resize-none" 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
                }}
              />
              <Button type="submit" disabled={isLoading || !input.trim()} className="h-auto">
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}