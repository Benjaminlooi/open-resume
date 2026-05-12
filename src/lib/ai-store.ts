import { create } from "zustand";
import type { AIProvider } from "./settings-store";

export interface Message {
	role: "user" | "assistant" | "system" | "tool";
	content: string | any[];
	_toolCalls?: any[];
}

interface AIState {
	isOpen: boolean;
	messages: Message[];
	input: string;
	isLoading: boolean;
	error: string | null;
	selectedProvider: AIProvider | null;
	abortController: AbortController | null;

	// Actions
	setIsOpen: (isOpen: boolean) => void;
	setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
	setInput: (input: string) => void;
	setIsLoading: (isLoading: boolean) => void;
	setError: (error: string | null) => void;
	setSelectedProvider: (provider: AIProvider) => void;
	setAbortController: (controller: AbortController | null) => void;
	reset: () => void;
}

export const useAIStore = create<AIState>((set) => ({
	isOpen: false,
	messages: [],
	input: "",
	isLoading: false,
	error: null,
	selectedProvider: null,
	abortController: null,

	setIsOpen: (isOpen) => set({ isOpen }),
	setMessages: (messagesOrFn) =>
		set((state) => ({
			messages:
				typeof messagesOrFn === "function"
					? messagesOrFn(state.messages)
					: messagesOrFn,
		})),
	setInput: (input) => set({ input }),
	setIsLoading: (isLoading) => set({ isLoading }),
	setError: (error) => set({ error }),
	setSelectedProvider: (selectedProvider) => set({ selectedProvider }),
	setAbortController: (abortController) => set({ abortController }),
	reset: () =>
		set({
			messages: [],
			input: "",
			isLoading: false,
			error: null,
			abortController: null,
		}),
}));
