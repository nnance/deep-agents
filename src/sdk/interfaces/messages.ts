import type {
	TextGenerationResponse,
} from "./providers.js";

// Chat completion interfaces
export interface Message {
	role: "system" | "user" | "assistant"; // The role of the message sender
	content: string; // The content of the message
}

export interface ChatCompletionOptions {
	prompt?: string; // Optional - use either prompt or messages
	messages?: Message[]; // Use messages for chat mode (overrides prompt)
	maxToolCalls?: number; // Maximum number of tool calls allowed (default: 10)
}

export interface LLMProviderWithMessages {
	// Send a structured list of input messages with text and/or image content, and the model will generate the next message in the conversation.
	generateChatCompletion(
		options: ChatCompletionOptions,
	): Promise<TextGenerationResponse>;
}
