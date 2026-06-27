import type { StateCreator } from "zustand";
import type { RootState } from "./root-store";
export type AIProvider =
	| "openai"
	| "anthropic"
	| "google"
	| "deepseek"
	| "groq"
	| "ollama"
	| "lmstudio";

export interface Message {
	role: "user" | "assistant" | "system" | "tool";
	content: string | any[];
	_toolCalls?: any[];
}

export interface AISlice {
	isOpen: boolean;
	messages: Message[];
	input: string;
	isLoading: boolean;
	error: string | null;
	selectedProvider: AIProvider | null;
	abortController: AbortController | null;

	setIsOpen: (isOpen: boolean) => void;
	setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
	setInput: (input: string) => void;
	setIsLoading: (isLoading: boolean) => void;
	setError: (error: string | null) => void;
	setSelectedProvider: (provider: AIProvider) => void;
	setAbortController: (controller: AbortController | null) => void;
	reset: () => void;
}

export const createAISlice: StateCreator<RootState, [], [], AISlice> = (set) => ({
	isOpen: false,
	messages: [],
	input: "",
	isLoading: false,
	error: null,
	selectedProvider: null,
	abortController: null,

	setIsOpen: (isOpen) =>
		set((state) => ({ ai: { ...state.ai, isOpen } })),
	setMessages: (messagesOrFn) =>
		set((state) => ({
			ai: {
				...state.ai,
				messages:
					typeof messagesOrFn === "function"
						? messagesOrFn(state.ai.messages)
						: messagesOrFn,
			},
		})),
	setInput: (input) =>
		set((state) => ({ ai: { ...state.ai, input } })),
	setIsLoading: (isLoading) =>
		set((state) => ({ ai: { ...state.ai, isLoading } })),
	setError: (error) =>
		set((state) => ({ ai: { ...state.ai, error } })),
	setSelectedProvider: (selectedProvider) =>
		set((state) => ({ ai: { ...state.ai, selectedProvider } })),
	setAbortController: (abortController) =>
		set((state) => ({ ai: { ...state.ai, abortController } })),
	reset: () =>
		set((state) => ({
			ai: {
				...state.ai,
				messages: [],
				input: "",
				isLoading: false,
				error: null,
				abortController: null,
			},
		})),
});
