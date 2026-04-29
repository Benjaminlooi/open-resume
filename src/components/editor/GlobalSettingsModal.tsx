import { Settings } from "lucide-react";
import { useStore } from "@tanstack/react-store";
import { settingsStore, updateAPIKey, setDefaultProvider, type AIProvider } from "#/lib/settings-store";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Button } from "#/components/ui/button";

const PROVIDERS: { id: AIProvider; name: string }[] = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "google", name: "Google (Gemini)" },
  { id: "deepseek", name: "DeepSeek" },
  { id: "groq", name: "Groq" },
];

export function GlobalSettingsModal() {
  const { apiKeys, defaultProvider } = useStore(settingsStore);

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
            Configure your AI providers. API keys are stored locally in your browser.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="default-provider">Default Provider</Label>
            <Select value={defaultProvider} onValueChange={(val) => setDefaultProvider(val as AIProvider)}>
              <SelectTrigger id="default-provider">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2 pt-4 border-t-2 border-border">
            <h4 className="font-heading text-sm font-bold">API Keys</h4>
            {PROVIDERS.map((p) => (
              <div key={p.id} className="grid gap-1">
                <Label htmlFor={`key-${p.id}`} className="text-xs">{p.name}</Label>
                <Input 
                  id={`key-${p.id}`}
                  type="password" 
                  placeholder={`Enter ${p.name} API Key`}
                  value={apiKeys[p.id] || ""}
                  onChange={(e) => updateAPIKey(p.id, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
