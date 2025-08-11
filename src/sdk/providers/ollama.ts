import type { LLMProvider, TextGenerationOptions, TextGenerationResponse } from '../interfaces/providers.js';
import type { ChatCompletionOptions, LLMProviderWithMessages } from '../interfaces/messages.js';
import type { 
	LLMProviderWithTools, 
	ChatWithToolsOptions, 
	ChatWithToolsResponse, 
	ToolCall
} from '../interfaces/tools.js';
import { 
	GenerationResponseSchema, 
	StreamChunkSchema, 
	ModelsResponseSchema,
	ChatResponseSchema,
	ChatStreamChunkSchema,
	type GenerationResponse,
	type StreamChunk,
	type ModelsResponse,
	type ChatResponse,
	type ChatStreamChunk
} from './ollama-schemas.js';

export interface OllamaConfig {
	baseUrl?: string;
}

export interface OllamaProvider {
	listModels(): Promise<string[]>;
	isServerRunning(): Promise<boolean>;
}

// Pure function to create request body
const createRequestBody = (options: TextGenerationOptions) => {
	const { model, prompt, maxTokens, stream = false, systemPrompt } = options;
	
	const requestBody: Record<string, any> = {
		model,
		prompt,
		stream
	};

	// Compose the request body using functional approach
	return [
		systemPrompt ? { system: systemPrompt } : {},
		maxTokens ? { options: { num_predict: maxTokens } } : {},
		requestBody
	].reduce((acc, obj) => ({ ...acc, ...obj }), {});
};

// Pure function to create request body for chat completion
const createChatRequestBody = (options: TextGenerationOptions & ChatCompletionOptions) => {
	const { model, maxTokens, stream = false, systemPrompt, messages, prompt } = options;
	
	// If messages are provided, use them; otherwise convert prompt to a message
	const chatMessages = messages || (prompt ? [{ role: 'user' as const, content: prompt }] : []);
	
	// Convert our Message format to Ollama's format and add system message if provided
	const ollamaMessages = systemPrompt ? 
		[{ role: 'system', content: systemPrompt }, ...chatMessages] : 
		chatMessages;

	const requestBody: Record<string, any> = {
		model,
		messages: ollamaMessages,
		stream
	};

	// Compose the request body using functional approach
	return maxTokens ? 
		{ ...requestBody, options: { num_predict: maxTokens } } : 
		requestBody;
};

// Pure function to create request body for chat with tools
const createChatWithToolsRequestBody = (options: TextGenerationOptions & ChatWithToolsOptions) => {
	const { model, maxTokens, stream = false, systemPrompt, messages = [], tools = [] } = options;
	
	// Convert our MessageWithTool format to Ollama's format
	const ollamaMessages = messages.map((msg, idx) => {
		if (msg.role === 'tool' && msg.toolCallId) {
			// Tool result message - in Ollama this becomes a user message with the result
			return {
				role: 'tool',
				content: msg.content,
				tool_name: msg.toolName
			};
		} else if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
			// Assistant message with tool calls
			return {
				role: 'assistant',
				content: msg.content || '',
				tool_calls: msg.toolCalls.map(toolCall => ({
					function: {
						name: toolCall.name,
						arguments: toolCall.arguments
					}
				}))
			};
		} else {
			// Regular message
			return {
				role: msg.role,
				content: msg.content
			};
		}
	});

	// Add system prompt if provided
	const finalMessages = systemPrompt ? 
		[{ role: 'system', content: systemPrompt }, ...ollamaMessages] : 
		ollamaMessages;

	// Convert tools to Ollama format
	const ollamaTools = tools.map(tool => ({
		type: 'function',
		function: {
			name: tool.name,
			description: tool.description,
			parameters: tool.parameters
		}
	}));

	const requestBody: Record<string, any> = {
		model,
		messages: finalMessages,
		stream
	};

	// Add tools if provided
	if (ollamaTools.length > 0) {
		requestBody.tools = ollamaTools;
	}

	// Compose the request body using functional approach
	return maxTokens ? 
		{ ...requestBody, options: { num_predict: maxTokens } } : 
		requestBody;
};

// Pure function to handle non-streaming response
const parseResponse = async (response: Response): Promise<TextGenerationResponse> => {
	const rawData = await response.json();
	
	// Validate the response using Zod schema
	const validationResult = GenerationResponseSchema.safeParse(rawData);
	if (!validationResult.success) {
		throw new Error(`Invalid Ollama API response format: ${validationResult.error.message}`);
	}
	
	const data: GenerationResponse = validationResult.data;
	const promptTokens = data.prompt_eval_count ?? 0;
	const completionTokens = data.eval_count ?? 0;
	
	return {
		text: data.response || '',
		usage: {
			promptTokens,
			completionTokens,
			totalTokens: promptTokens + completionTokens
		}
	};
};

// Higher-order function for parsing JSON lines with validation
const parseJsonLines = (lines: string[]): StreamChunk[] => 
	lines.map(line => {
		try {
			const parsed = JSON.parse(line);
			const validationResult = StreamChunkSchema.safeParse(parsed);
			return validationResult.success ? validationResult.data : null;
		} catch {
			return null;
		}
	}).filter((chunk): chunk is StreamChunk => chunk !== null);

// Pure function to accumulate streaming response data
const accumulateStreamData = (chunks: StreamChunk[]) => 
	chunks.reduce(
		(acc, data) => ({
			text: acc.text + (data.response || ''),
			promptTokens: data.done ? (data.prompt_eval_count || 0) : acc.promptTokens,
			completionTokens: data.done ? (data.eval_count || 0) : acc.completionTokens
		}),
		{ text: '', promptTokens: 0, completionTokens: 0 }
	);

// Pure function to handle streaming response
const parseStreamResponse = async (response: Response): Promise<TextGenerationResponse> => {
	if (!response.body) {
		throw new Error('No response body available for streaming');
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	const chunks: StreamChunk[] = [];

	try {
		let done = false;
		while (!done) {
			const { done: readerDone, value } = await reader.read();
			done = readerDone;
			
			if (value) {
				const chunk = decoder.decode(value);
				const lines = chunk.split('\n').filter(line => line.trim());
				const parsedChunks = parseJsonLines(lines);
				chunks.push(...parsedChunks);
			}
		}
	} finally {
		reader.releaseLock();
	}

	const accumulated = accumulateStreamData(chunks);
	
	return {
		text: accumulated.text,
		usage: {
			promptTokens: accumulated.promptTokens,
			completionTokens: accumulated.completionTokens,
			totalTokens: accumulated.promptTokens + accumulated.completionTokens
		}
	};
};

// Pure function to handle non-streaming chat response
const parseChatResponse = async (response: Response): Promise<TextGenerationResponse> => {
	const rawData = await response.json();
	
	// Validate the response using Zod schema
	const validationResult = ChatResponseSchema.safeParse(rawData);
	if (!validationResult.success) {
		throw new Error(`Invalid Ollama chat API response format: ${validationResult.error.message}`);
	}
	
	const data: ChatResponse = validationResult.data;
	const promptTokens = data.prompt_eval_count ?? 0;
	const completionTokens = data.eval_count ?? 0;
	
	return {
		text: data.message?.content || '',
		usage: {
			promptTokens,
			completionTokens,
			totalTokens: promptTokens + completionTokens
		}
	};
};

// Pure function to handle tools response
const parseToolsResponse = async (response: Response): Promise<ChatWithToolsResponse> => {
	const rawData = await response.json();
	if (!rawData || typeof rawData !== 'object') {
		throw new Error('Invalid response format from Ollama chat API');
	}

	// Validate the response using Zod schema
	const validationResult = ChatResponseSchema.safeParse(rawData);
	if (!validationResult.success) {
		throw new Error(`Invalid Ollama chat API response format: ${validationResult.error.message}`);
	}
	
	const data: ChatResponse = validationResult.data;
	const promptTokens = data.prompt_eval_count ?? 0;
	const completionTokens = data.eval_count ?? 0;
	
	// Extract text content and tool calls
	const text = data.message?.content || '';
	const toolCalls: ToolCall[] = [];
	
	if (data.message?.tool_calls) {
		for (const ollamaToolCall of data.message.tool_calls) {
			try {
				toolCalls.push({
					id: `ollama_${Date.now()}_${Math.random()}`,
					name: ollamaToolCall.function.name,
					arguments: ollamaToolCall.function.arguments || {}
				});
			} catch (error) {
				// If arguments parsing fails, use empty object
				toolCalls.push({
					id: `ollama_${Date.now()}_${Math.random()}`,
					name: ollamaToolCall.function.name,
					arguments: {}
				});
			}
		}
	}

	const result: TextGenerationResponse & ChatWithToolsResponse = {
		text,
		usage: {
			promptTokens,
			completionTokens,
			totalTokens: promptTokens + completionTokens
		},
		toolCallCount: toolCalls.length,
		maxToolCallsReached: false
	};
	
	if (toolCalls.length > 0) {
		result.toolCalls = toolCalls;
	}
	
	return result;
};

// Higher-order function for parsing chat JSON lines with validation
const parseChatJsonLines = (lines: string[]): ChatStreamChunk[] => 
	lines.map(line => {
		try {
			const parsed = JSON.parse(line);
			const validationResult = ChatStreamChunkSchema.safeParse(parsed);
			return validationResult.success ? validationResult.data : null;
		} catch {
			return null;
		}
	}).filter((chunk): chunk is ChatStreamChunk => chunk !== null);

// Pure function to accumulate chat streaming response data
const accumulateChatStreamData = (chunks: ChatStreamChunk[]) => 
	chunks.reduce(
		(acc, data) => ({
			text: acc.text + (data.message?.content || ''),
			promptTokens: data.done ? (data.prompt_eval_count || 0) : acc.promptTokens,
			completionTokens: data.done ? (data.eval_count || 0) : acc.completionTokens
		}),
		{ text: '', promptTokens: 0, completionTokens: 0 }
	);

// Pure function to handle streaming chat response
const parseChatStreamResponse = async (response: Response): Promise<TextGenerationResponse> => {
	if (!response.body) {
		throw new Error('No response body available for streaming');
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	const chunks: ChatStreamChunk[] = [];

	try {
		let done = false;
		while (!done) {
			const { done: readerDone, value } = await reader.read();
			done = readerDone;
			
			if (value) {
				const chunk = decoder.decode(value);
				const lines = chunk.split('\n').filter(line => line.trim());
				const parsedChunks = parseChatJsonLines(lines);
				chunks.push(...parsedChunks);
			}
		}
	} finally {
		reader.releaseLock();
	}

	const accumulated = accumulateChatStreamData(chunks);
	
	return {
		text: accumulated.text,
		usage: {
			promptTokens: accumulated.promptTokens,
			completionTokens: accumulated.completionTokens,
			totalTokens: accumulated.promptTokens + accumulated.completionTokens
		}
	};
};

// Higher-order function for API requests
const makeRequest = (baseUrl: string) => async (endpoint: string, options?: RequestInit) => {
	const response = await fetch(`${baseUrl}${endpoint}`, options);
	
	if (!response.ok) {
		throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
	}
	
	return response;
};

// Pure function to extract model names from API response with validation
const extractModelNames = (rawData: unknown): string[] => {
	const validationResult = ModelsResponseSchema.safeParse(rawData);
	
	if (!validationResult.success || !validationResult.data.models) {
		// Return empty array if validation fails or no models found
		return [];
	}
	
	const data: ModelsResponse = validationResult.data;
	return data.models?.map(model => model.name) || [];
};

// Error handling wrapper (higher-order function)
const withErrorHandling = <T extends any[], R>(
	fn: (...args: T) => Promise<R>,
	errorMessage: string
) => async (...args: T): Promise<R> => {
	try {
		return await fn(...args);
	} catch (error) {
		throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
};

// Main factory function to create Ollama provider
export const createOllamaProvider = (config: OllamaConfig = {}): LLMProvider & LLMProviderWithMessages & LLMProviderWithTools & OllamaProvider => {
	const baseUrl = config.baseUrl || 'http://localhost:11434';
	const request = makeRequest(baseUrl);

	const generateText = withErrorHandling(
		async (options: TextGenerationOptions): Promise<TextGenerationResponse> => {
			const requestBody = createRequestBody(options);
			
			const response = await request('/api/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody),
			});

			return options.stream ? parseStreamResponse(response) : parseResponse(response);
		},
		'Failed to generate text with Ollama'
	);

	const generateChatCompletion = withErrorHandling(
		async (options: TextGenerationOptions & ChatCompletionOptions): Promise<TextGenerationResponse> => {
			const requestBody = createChatRequestBody(options);
			
			const response = await request('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody),
			});

			return options.stream ? parseChatStreamResponse(response) : parseChatResponse(response);
		},
		'Failed to generate chat completion with Ollama'
	);

	const generateChatWithTools = withErrorHandling(
		async (options: TextGenerationOptions & ChatWithToolsOptions): Promise<ChatWithToolsResponse> => {
			const requestBody = createChatWithToolsRequestBody(options);

			if (options.maxToolCalls && options.maxToolCalls < 1) {
				throw new Error('maxToolCalls must be at least 1');
			}

			const response = await request('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody),
			});

			// For tools, we only support non-streaming for now
			return parseToolsResponse(response);
		},
		'Failed to generate chat with tools with Ollama'
	);

	const listModels = withErrorHandling(
		async (): Promise<string[]> => {
			const response = await request('/api/tags');
			const data = await response.json();
			return extractModelNames(data);
		},
		'Failed to list Ollama models'
	);

	const isServerRunning = async (): Promise<boolean> => {
		try {
			await request('/api/tags');
			return true;
		} catch {
			return false;
		}
	};

	return {
		generateText,
		generateChatCompletion,
		generateChatWithTools,
		listModels,
		isServerRunning
	};
};
