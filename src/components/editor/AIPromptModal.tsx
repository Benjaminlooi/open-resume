import { useStore } from "@tanstack/react-store";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { generateExperienceBullets } from "#/lib/ai";
import { type AIProvider, settingsStore } from "#/lib/settings-store";

interface AIPromptModalProps {
  role: string;
  company: string;
  onGenerate: (text: string) => void;
}

export function AIPromptModal({ role, company, onGenerate }: AIPromptModalProps) {
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { defaultProvider, apiKeys, baseUrls, selectedModels } = useStore(settingsStore);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(defaultProvider);

  const isLocal = selectedProvider === "ollama" || selectedProvider === "lmstudio";
  
  const hasKeyOrConfig = isLocal 
    ? (!!baseUrls[selectedProvider] && !!selectedModels[selectedProvider])
    : !!apiKeys[selectedProvider];

  const handleGenerate = async () => {
    if (!hasKeyOrConfig) {
      if (isLocal) {
        setError(`Base URL and Selected Model must be configured for ${selectedProvider} in Global Settings.`);
      } else {
        setError(`No API key for ${selectedProvider}. Please add it in Global Settings first.`);
      }
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateExperienceBullets({
        role,
        company,
        instructions,
        providerId: selectedProvider,
      });
      onGenerate(result);
      setOpen(false);
      setInstructions("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {      
      setIsGenerating(false);
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
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Generate Resume Bullets</DialogTitle>
						<DialogDescription>
							Provide specific instructions on what to highlight for your role
							at {company || "this company"}.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="instructions">Instructions</Label>
							<Textarea
								id="instructions"
								placeholder="e.g. Focus on my leadership skills and how I increased revenue by 20%..."
								value={instructions}
								onChange={(e) => setInstructions(e.target.value)}
								className="h-24"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="provider-override">Provider</Label>
							<Select
								value={selectedProvider}
								onValueChange={(val) => setSelectedProvider(val as AIProvider)}
							>
								<SelectTrigger id="provider-override">
									<SelectValue placeholder="Select provider" />
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
						{error && (
							<p className="text-sm font-bold text-red-500 bg-red-100 p-2 border-2 border-red-500 rounded-base">
								{error}
							</p>
						)}
					</div>
					<div className="flex justify-end gap-2">
						<Button
							variant="neutral"
							onClick={() => setOpen(false)}
							disabled={isGenerating}
						>
							Cancel
						</Button>
						<Button
							onClick={handleGenerate}
							disabled={isGenerating || !hasKeyOrConfig}
						>
							{isGenerating && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							Generate
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		);
}
