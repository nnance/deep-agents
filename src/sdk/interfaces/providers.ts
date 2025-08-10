// Options for text generation
export interface TextGenerationOptions {
	model: string; // The model to use for text generation
	prompt: string; // The input prompt for the model
	maxTokens?: number; // The maximum number of tokens to generate
	stream?: boolean; // Whether to stream the response
	systemPrompt?: string; // An optional system prompt for the model
}

// Response for text generation
export interface TextGenerationResponse {
	text: string; // The generated text from the model
	usage?: {
		promptTokens?: number; // The number of tokens in the prompt
		completionTokens?: number; // The number of tokens in the completion
		totalTokens?: number; // The total number of tokens used
	};
}

// Large language model provider interface for text generation
export interface LLMProvider {
	generateText(options: TextGenerationOptions): Promise<TextGenerationResponse>;
}
