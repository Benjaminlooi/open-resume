import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { AIConfig } from "./config.js";

let currentConfig: AIConfig | null = null;

export function loadAIConfig(
	aiConfigPath: string,
	envDefaults: AIConfig,
): AIConfig {
	if (existsSync(aiConfigPath)) {
		try {
			const raw = readFileSync(aiConfigPath, "utf8");
			const stored = JSON.parse(raw) as Partial<AIConfig>;
			currentConfig = {
				provider: stored.provider ?? envDefaults.provider,
				apiKey: stored.apiKey ?? envDefaults.apiKey,
				modelName: stored.modelName ?? envDefaults.modelName,
				baseUrl: stored.baseUrl ?? envDefaults.baseUrl,
			};
			return currentConfig;
		} catch {
			// Corrupted file — fall back to env defaults
		}
	}

	currentConfig = { ...envDefaults };
	return currentConfig;
}

export function getAIConfig(): AIConfig {
	if (!currentConfig) {
		throw new Error("AI config not initialized. Call loadAIConfig first.");
	}
	return currentConfig;
}

export function setAIConfig(config: AIConfig): void {
	currentConfig = { ...config };
}

export function saveAIConfigToFile(
	aiConfigPath: string,
	config: AIConfig,
): void {
	mkdirSync(dirname(aiConfigPath), { recursive: true });
	writeFileSync(aiConfigPath, JSON.stringify(config, null, 2), "utf8");
}

export function maskApiKey(key: string): string {
	if (!key) return "";
	if (key.length <= 12) return "••••••••";
	return `${key.slice(0, 8)}...${key.slice(-4)}`;
}
