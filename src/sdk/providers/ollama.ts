import type { LLMProvider, TextGenerationOptions, TextGenerationResponse } from '../interfaces/providers.js';

export interface OllamaConfig {
	baseUrl?: string;
}

export interface OllamaProvider {
	generateText(options: TextGenerationOptions): Promise<TextGenerationResponse>;
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

// Pure function to handle non-streaming response
const parseResponse = async (response: Response): Promise<TextGenerationResponse> => {
	const data = await response.json();
	
	return {
		text: data.response || '',
		usage: {
			promptTokens: data.prompt_eval_count,
			completionTokens: data.eval_count,
			totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
		}
	};
};

// Higher-order function for parsing JSON lines
const parseJsonLines = (lines: string[]) => 
	lines.map(line => {
		try {
			return JSON.parse(line);
		} catch {
			return null;
		}
	}).filter(Boolean);

// Pure function to accumulate streaming response data
const accumulateStreamData = (chunks: any[]) => 
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
const makeRequest = (baseUrl: string) => async (endpoint: string, options?: RequestInit) => {
	const response = await fetch(`${baseUrl}${endpoint}`, options);
	
	if (!response.ok) {
		throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
	}
	
	return response;
};

// Pure function to extract model names
const extractModelNames = (data: any): string[] => 
	data.models?.map((model: any) => model.name) || [];

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
export const createOllamaProvider = (config: OllamaConfig = {}): OllamaProvider => {
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
		listModels,
		isServerRunning
	};
};
