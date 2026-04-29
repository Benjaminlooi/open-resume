import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { settingsStore, type AIProvider } from "./settings-store";

interface GenerateParams {
  role: string;
  company: string;
  instructions: string;
  providerId?: AIProvider;
}

export async function generateExperienceBullets({
  role,
  company,
  instructions,
  providerId,
}: GenerateParams): Promise<string> {
  const state = settingsStore.state;
  const activeProvider = providerId || state.defaultProvider;
  const apiKey = state.apiKeys[activeProvider];

  if (!apiKey) {
    throw new Error(`No API key configured for ${activeProvider}. Please add it in settings.`);
  }

  let model;

  switch (activeProvider) {
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
      // DeepSeek provides an OpenAI-compatible API
      model = createOpenAI({ apiKey, baseURL: "https://api.deepseek.com/v1" })("deepseek-chat");
      break;
    case "groq":
      // Groq provides an OpenAI-compatible API
      model = createOpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" })("llama3-8b-8192");
      break;
    default:
      throw new Error(`Unsupported provider: ${activeProvider}`);
  }

  const prompt = `
You are an expert resume writer.
Write 3-5 impressive, quantifiable bullet points for an experience section on a resume.
Role: ${role || "Professional"}
Company: ${company || "A Company"}
Additional Instructions from User: ${instructions}

Format the output strictly as HTML <ul> and <li> tags. Do not include markdown code block formatting (like \`\`\`html), just the raw tags.
`;

  try {
    const { text } = await generateText({
      model,
      prompt,
    });
    
    // Clean up potential markdown block artifacts
    return text.replace(/```html\n?/g, "").replace(/```\n?/g, "").trim();
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("Failed to generate content. Please check your API key and try again.");
  }
}
