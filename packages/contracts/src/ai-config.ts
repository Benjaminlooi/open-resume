import { z } from "zod";

export const aiProviderSchema = z.enum([
	"openai",
	"anthropic",
	"google",
	"deepseek",
	"groq",
	"ollama",
	"lmstudio",
	"custom",
]);
export type AIProvider = z.infer<typeof aiProviderSchema>;

export const providerDisplayNames: Record<AIProvider, string> = {
	openai: "OpenAI",
	anthropic: "Anthropic",
	google: "Google (Gemini)",
	deepseek: "DeepSeek",
	groq: "Groq",
	ollama: "Ollama (Local)",
	lmstudio: "LM Studio (Local)",
	custom: "Custom (OpenAI-Compatible)",
};

export const providerDefaultModels: Record<AIProvider, string> = {
	openai: "gpt-4o-mini",
	anthropic: "claude-3-5-haiku-latest",
	google: "gemini-3.5-flash",
	deepseek: "deepseek-chat",
	groq: "llama-3.3-70b-versatile",
	ollama: "llama3.2",
	lmstudio: "default",
	custom: "",
};

export const CLOUD_PROVIDERS: AIProvider[] = [
	"openai",
	"anthropic",
	"google",
	"deepseek",
	"groq",
	"custom",
];

export const LOCAL_PROVIDERS: AIProvider[] = ["ollama", "lmstudio"];

// GET /ai/config response — apiKey is masked
export const aiConfigResponseSchema = z.object({
	provider: aiProviderSchema,
	apiKeyMasked: z.string(),
	modelName: z.string(),
	baseUrl: z.string().optional(),
	hasApiKey: z.boolean(),
});
export type AIConfigResponse = z.infer<typeof aiConfigResponseSchema>;

// PUT /ai/config request — apiKey is optional (omit to keep existing)
export const updateAiConfigRequestSchema = z.object({
	provider: aiProviderSchema.optional(),
	apiKey: z.string().optional(),
	modelName: z.string().optional(),
	baseUrl: z.string().optional(),
});
export type UpdateAiConfigRequest = z.infer<typeof updateAiConfigRequestSchema>;

// PUT /ai/config response
export const updateAiConfigResponseSchema = z.object({
	provider: aiProviderSchema,
	apiKeyMasked: z.string(),
	modelName: z.string(),
	baseUrl: z.string().optional(),
	hasApiKey: z.boolean(),
});
export type UpdateAiConfigResponse = z.infer<typeof updateAiConfigResponseSchema>;
