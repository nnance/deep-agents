import type { LLMProvider, TextGenerationOptions, TextGenerationResponse } from '../interfaces/providers.js';

export interface AnthropicConfig {
	apiKey: string;
	baseUrl?: string;
	version?: string;
}

export interface AnthropicProvider extends LLMProvider {
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

// Pure function to handle non-streaming response
const parseResponse = async (response: Response): Promise<TextGenerationResponse> => {
	const data = await response.json();
	
	return {
		text: data.content?.[0]?.text || '',
		usage: {
			promptTokens: data.usage?.input_tokens,
			completionTokens: data.usage?.output_tokens,
			totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
		}
	};
};

// Higher-order function for parsing JSON lines
const parseJsonLines = (lines: string[]) => 
	lines
		.filter(line => line.trim().startsWith('data: '))
		.map(line => line.replace('data: ', '').trim())
		.filter(line => line !== '[DONE]')
		.map(line => {
			try {
				return JSON.parse(line);
			} catch {
				return null;
			}
		})
		.filter(Boolean);

// Pure function to accumulate streaming response data
const accumulateStreamData = (chunks: any[]) => 
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
	const chunks: any[] = [];

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
const sendMessages = async (request: (endpoint: string, options?: RequestInit) => Promise<Response>, requestBody: Record<string, any>, options: TextGenerationOptions): Promise<TextGenerationResponse> => {
			const response = await request('/v1/messages', {
				method: 'POST',
				body: JSON.stringify(requestBody),
			});

			return options.stream ? parseStreamResponse(response) : parseResponse(response);
	};


// Pure function to extract model names from API response
const extractModelNames = (modelsData: any): string[] => {
	if (!modelsData?.data || !Array.isArray(modelsData.data)) {
		// Fallback to known models if API response is invalid
		return knownModels;
	}
	
	return modelsData.data.map((model: any) => model.id).filter(Boolean);
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

	const listModels = withErrorHandling(
		async (): Promise<string[]> => {
			return await getModels();
		},
		'Failed to list Anthropic models'
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
		listModels,
		isServiceAvailable
	};
};
