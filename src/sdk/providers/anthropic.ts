import type { TextGenerationOptions, TextGenerationResponse } from '../interfaces/providers.js';
import type { ChatCompletionOptions } from '../interfaces/messages.js';
import type { 
	LLMProviderWithTools, 
	ChatWithToolsOptions, 
	ChatWithToolsResponse, 
	ToolCall,
} from '../interfaces/tools.js';
import { 
	MessageResponseSchema, 
	StreamChunkSchema, 
	ModelsResponseSchema,
	type MessageResponse,
	type StreamChunk,
	type ModelsResponse
} from './anthropic-schemas.js';

export interface AnthropicConfig {
	apiKey: string;
	baseUrl?: string;
	version?: string;
}

export interface AnthropicProvider extends LLMProviderWithTools {
	listModels(): Promise<string[]>;
	isServiceAvailable(): Promise<boolean>;
}

const knownModels = [
	'claude-3-5-sonnet-20241022',
	'claude-3-5-haiku-20241022',
	'claude-3-opus-20240229',
	'claude-3-sonnet-20240229',
	'claude-3-haiku-20240307'
]

// Pure function to create request body for Anthropic API
const createRequestBody = (options: TextGenerationOptions) => {
	const { model, prompt, maxTokens = 4096, stream = false, systemPrompt } = options;
	
	const messages = [
		{ role: 'user' as const, content: prompt }
	];

	const requestBody: Record<string, any> = {
		model,
		max_tokens: maxTokens,
		messages,
		stream
	};

	// Compose the request body using functional approach
	return systemPrompt 
		? { ...requestBody, system: systemPrompt }
		: requestBody;
};

// Pure function to create request body for chat completion
const createChatRequestBody = (options: ChatCompletionOptions) => {
	const { model, maxTokens = 4096, stream = false, systemPrompt, messages, prompt } = options;
	
	// If messages are provided, use them; otherwise convert prompt to a message
	const chatMessages = messages || (prompt ? [{ role: 'user' as const, content: prompt }] : []);
	
	// Convert our Message format to Anthropic's format
	const anthropicMessages = chatMessages.map(msg => ({
		role: msg.role === 'assistant' ? 'assistant' : 'user',
		content: msg.content
	}));

	const requestBody: Record<string, any> = {
		model,
		max_tokens: maxTokens,
		messages: anthropicMessages,
		stream
	};

	// Compose the request body using functional approach
	return systemPrompt 
		? { ...requestBody, system: systemPrompt }
		: requestBody;
};

// Pure function to create request body for chat with tools
const createChatWithToolsRequestBody = (options: ChatWithToolsOptions) => {
	const { model, maxTokens = 4096, stream = false, systemPrompt, messages = [], tools = [] } = options;
	
	// Convert our MessageWithTool format to Anthropic's format
	const anthropicMessages = messages.map(msg => {
		if (msg.role === 'tool') {
			// Tool result message
			return {
				role: 'user',
				content: [
					{
						type: 'tool_result',
						tool_use_id: msg.toolCallId,
						content: msg.content
					}
				]
			};
		} else if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
			// Assistant message with tool calls
			const content = [];
			
			// Add text content if present
			if (msg.content) {
				content.push({
					type: 'text',
					text: msg.content
				});
			}
			
			// Add tool use blocks
			msg.toolCalls.forEach(toolCall => {
				content.push({
					type: 'tool_use',
					id: toolCall.id,
					name: toolCall.name,
					input: toolCall.arguments
				});
			});
			
			return {
				role: 'assistant',
				content
			};
		} else {
			// Regular message
			return {
				role: msg.role === 'assistant' ? 'assistant' : 'user',
				content: msg.content
			};
		}
	});

	// Convert tools to Anthropic format
	const anthropicTools = tools.map(tool => ({
		name: tool.name,
		description: tool.description,
		input_schema: tool.parameters
	}));

	const requestBody: Record<string, any> = {
		model,
		max_tokens: maxTokens,
		messages: anthropicMessages,
		stream
	};

	// Add tools if provided
	if (anthropicTools.length > 0) {
		requestBody.tools = anthropicTools;
	}

	// Compose the request body using functional approach
	return systemPrompt 
		? { ...requestBody, system: systemPrompt }
		: requestBody;
};

// Pure function to handle non-streaming response
const parseResponse = async (response: Response): Promise<TextGenerationResponse> => {
	const rawData = await response.json();
	
	// Validate the response using Zod schema
	const validationResult = MessageResponseSchema.safeParse(rawData);
	if (!validationResult.success) {
		throw new Error(`Invalid Anthropic API response format: ${validationResult.error.message}`);
	}
	
	const data: MessageResponse = validationResult.data;
	const promptTokens = data.usage?.input_tokens ?? 0;
	const completionTokens = data.usage?.output_tokens ?? 0;
	
	return {
		text: data.content?.[0]?.type === 'text' ? data.content[0].text : '',
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
	
	// Validate the response using Zod schema
	const validationResult = MessageResponseSchema.safeParse(rawData);
	if (!validationResult.success) {
		throw new Error(`Invalid Anthropic API response format: ${validationResult.error.message}`);
	}
	
	const data: MessageResponse = validationResult.data;
	const promptTokens = data.usage?.input_tokens ?? 0;
	const completionTokens = data.usage?.output_tokens ?? 0;
	
	// Extract text content and tool calls
	let text = '';
	const toolCalls: ToolCall[] = [];
	
	if (data.content) {
		for (const contentBlock of data.content) {
			if (contentBlock.type === 'text') {
				text += contentBlock.text;
			} else if (contentBlock.type === 'tool_use') {
				toolCalls.push({
					id: contentBlock.id,
					name: contentBlock.name,
					arguments: contentBlock.input
				});
			}
		}
	}
	
	const result: ChatWithToolsResponse = {
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

// Higher-order function for parsing JSON lines with validation
const parseJsonLines = (lines: string[]): StreamChunk[] => 
	lines
		.filter(line => line.trim().startsWith('data: '))
		.map(line => line.replace('data: ', '').trim())
		.filter(line => line !== '[DONE]')
		.map(line => {
			try {
				const parsed = JSON.parse(line);
				const validationResult = StreamChunkSchema.safeParse(parsed);
				return validationResult.success ? validationResult.data : null;
			} catch {
				return null;
			}
		})
		.filter((chunk): chunk is StreamChunk => chunk !== null);

// Pure function to accumulate streaming response data
const accumulateStreamData = (chunks: StreamChunk[]) => 
	chunks.reduce(
		(acc, data) => {
			if (data.type === 'content_block_delta' && data.delta?.text) {
				return {
					...acc,
					text: acc.text + data.delta.text
				};
			}
			if (data.type === 'message_stop' && data.usage) {
				return {
					...acc,
					promptTokens: data.usage.input_tokens || 0,
					completionTokens: data.usage.output_tokens || 0
				};
			}
			return acc;
		},
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

// Higher-order function for API requests
const makeRequest = (baseUrl: string, apiKey: string, version: string) => 
	async (endpoint: string, options?: RequestInit) => {
		const response = await fetch(`${baseUrl}${endpoint}`, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': version,
				...options?.headers
			}
		});
		
		if (!response.ok) {
			const errorData = await response.text();
			throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorData}`);
		}
		
		return response;
	};

// Function to send messages to the Anthropic API
// Anthropic API documentation: https://docs.anthropic.com/en/api/messages.md
const sendMessages = async (request: (endpoint: string, options?: RequestInit) => Promise<Response>, requestBody: Record<string, any>, options: { stream?: boolean }): Promise<TextGenerationResponse> => {
			const response = await request('/v1/messages', {
				method: 'POST',
				body: JSON.stringify(requestBody),
			});

			return options.stream ? parseStreamResponse(response) : parseResponse(response);
	};

// Function to send messages with tools to the Anthropic API
const sendToolsMessages = async (request: (endpoint: string, options?: RequestInit) => Promise<Response>, requestBody: Record<string, any>, options: { stream?: boolean }): Promise<ChatWithToolsResponse> => {
			const response = await request('/v1/messages', {
				method: 'POST',
				body: JSON.stringify(requestBody),
			});

			// For tools, we only support non-streaming for now
			return parseToolsResponse(response);
	};


// Pure function to extract model names from API response with validation
const extractModelNames = (rawModelsData: unknown): string[] => {
	const validationResult = ModelsResponseSchema.safeParse(rawModelsData);
	
	if (!validationResult.success || !validationResult.data.data) {
		// Fallback to known models if API response is invalid
		return knownModels;
	}
	
	const modelsData: ModelsResponse = validationResult.data;
	return modelsData.data?.map(model => model.id).filter(Boolean) || knownModels;
};

// Function to fetch available models from Anthropic API
// Anthropic API documentation: https://docs.anthropic.com/en/api/models-list.md
const fetchAvailableModels = (request: (endpoint: string, options?: RequestInit) => Promise<Response>) => 
	async (): Promise<string[]> => {
		try {
			const response = await request('/v1/models');
			const modelsData = await response.json();
			return extractModelNames(modelsData);
		} catch (error) {
			// Fallback to known models if API call fails
			return knownModels;;
		}
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

// Main factory function to create Anthropic provider
export const createAnthropicProvider = (config: AnthropicConfig): AnthropicProvider => {
	const { apiKey, baseUrl = 'https://api.anthropic.com', version = '2023-06-01' } = config;
	
	if (!apiKey) {
		throw new Error('Anthropic API key is required');
	}

	const request = makeRequest(baseUrl, apiKey, version);
	const getModels = fetchAvailableModels(request);

	const generateText = withErrorHandling(
		async (options: TextGenerationOptions): Promise<TextGenerationResponse> => {
			const requestBody = createRequestBody(options);
			return sendMessages(request, requestBody, options);
		},
		'Failed to generate text with Anthropic'
	);

	const generateChatCompletion = withErrorHandling(
		async (options: ChatCompletionOptions): Promise<TextGenerationResponse> => {
			const requestBody = createChatRequestBody(options);
			return sendMessages(request, requestBody, options);
		},
		'Failed to generate chat completion with Anthropic'
	);

	const listModels = withErrorHandling(
		async (): Promise<string[]> => {
			return await getModels();
		},
		'Failed to list Anthropic models'
	);

	const generateChatWithTools = withErrorHandling(
		async (options: ChatWithToolsOptions): Promise<ChatWithToolsResponse> => {
			const requestBody = createChatWithToolsRequestBody(options);
			return sendToolsMessages(request, requestBody, options);
		},
		'Failed to generate chat with tools with Anthropic'
	);

	const isServiceAvailable = async (): Promise<boolean> => {
		try {
			// Test with a minimal request to check if service is available
			await request('/v1/messages', {
				method: 'POST',
				body: JSON.stringify({
					model: 'claude-3-haiku-20240307',
					max_tokens: 1,
					messages: [{ role: 'user', content: 'test' }]
				}),
			});
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
		isServiceAvailable
	};
};
