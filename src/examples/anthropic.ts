import { createAnthropicProvider } from '../sdk/index.js';

async function functionalExample() {
	console.log('=== Functional Programming Style with Anthropic ===');
	
	// Create an Anthropic provider using functional approach
    // TODO: Use dotenv to retrieve environment variables
	const anthropic = createAnthropicProvider({
		apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key-here', // Get from environment
		baseUrl: 'https://api.anthropic.com' // Default Anthropic API URL
	});

	try {
		// Check if Anthropic service is available
		const isAvailable = await anthropic.isServiceAvailable();
		if (!isAvailable) {
			console.log('Anthropic service is not available. Please check your API key and connection.');
			return;
		}

		// List available models
		const models = await anthropic.listModels();
		console.log('Available models:', models);

		// Generate text using Claude 3.5 Sonnet
		const response = await anthropic.generateText({
			model: 'claude-3-5-sonnet-20241022',
			prompt: 'Explain what functional programming is in simple terms.',
			maxTokens: 200,
			systemPrompt: 'You are a helpful programming tutor that explains concepts clearly.'
		});

		console.log('Generated response:', response.text);
		console.log('Token usage:', response.usage);

		// Demonstrate streaming
		console.log('\n=== Streaming Example ===');
		const streamingResponse = await anthropic.generateText({
			model: 'claude-3-5-haiku-20241022',
			prompt: 'Write a haiku about functional programming.',
			maxTokens: 100,
			stream: true
		});

		console.log('Streamed response:', streamingResponse.text);
		console.log('Streaming token usage:', streamingResponse.usage);

	} catch (error) {
		console.error('Error:', error);
	}
}

// Demonstrate functional composition
const composeProviderOperations = (provider: ReturnType<typeof createAnthropicProvider>) => ({
	generateWithHealthCheck: async (options: Parameters<typeof provider.generateText>[0]) => {
		const isHealthy = await provider.isServiceAvailable();
		if (!isHealthy) {
			throw new Error('Anthropic service is not available');
		}
		return provider.generateText(options);
	},

	generateWithModelValidation: async (options: Parameters<typeof provider.generateText>[0]) => {
		const models = await provider.listModels();
		if (!models.includes(options.model)) {
			throw new Error(`Model ${options.model} is not available. Available models: ${models.join(', ')}`);
		}
		return provider.generateText(options);
	},

	batchGenerate: async (requests: Parameters<typeof provider.generateText>[0][]) => {
		return Promise.all(requests.map(request => provider.generateText(request)));
	}
});

// Higher-order function for retry logic
// TODO: Move to a separate utility file that can be reused with other providers
const withRetry = <T extends any[], R>(
	fn: (...args: T) => Promise<R>,
	maxRetries: number = 3,
	delay: number = 1000
) => async (...args: T): Promise<R> => {
	let lastError: Error;
	
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await fn(...args);
		} catch (error) {
			lastError = error as Error;
			if (attempt < maxRetries - 1) {
				console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
				await new Promise(resolve => setTimeout(resolve, delay));
				delay *= 2; // Exponential backoff
			}
		}
	}
	
	throw lastError!;
};

async function compositionExample() {
	console.log('\n=== Functional Composition Example ===');
	
	try {
		const anthropic = createAnthropicProvider({
			apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key-here'
		});

		// Compose enhanced operations
		const enhanced = composeProviderOperations(anthropic);

		// Add retry logic to text generation
		const generateWithRetry = withRetry(enhanced.generateWithHealthCheck, 3, 1000);

		const response = await generateWithRetry({
			model: 'claude-3-5-sonnet-20241022',
			prompt: 'What are the benefits of functional programming?',
			maxTokens: 150
		});

		console.log('Enhanced response:', response.text);

		// Batch generation example
		const batchResponses = await enhanced.batchGenerate([
			{
				model: 'claude-3-5-haiku-20241022',
				prompt: 'Define immutability',
				maxTokens: 50
			},
			{
				model: 'claude-3-5-haiku-20241022',
				prompt: 'Define pure functions',
				maxTokens: 50
			},
			{
				model: 'claude-3-5-haiku-20241022',
				prompt: 'Define higher-order functions',
				maxTokens: 50
			}
		]);

		console.log('Batch responses:');
		batchResponses.forEach((response, index) => {
			console.log(`Response ${index + 1}:`, response.text.substring(0, 100) + '...');
		});

	} catch (error) {
		console.error('Composition example error:', error);
	}
}

// Pure function for response transformation
const transformResponse = (response: Awaited<ReturnType<ReturnType<typeof createAnthropicProvider>['generateText']>>) => ({
	...response,
	wordCount: response.text.split(/\s+/).length,
	summary: response.text.length > 100 ? response.text.substring(0, 100) + '...' : response.text,
	efficiency: response.usage?.completionTokens && response.usage?.promptTokens 
		? response.usage.completionTokens / response.usage.promptTokens 
		: 0
});

async function transformationExample() {
	console.log('\n=== Response Transformation Example ===');
	
	try {
		const anthropic = createAnthropicProvider({
			apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key-here'
		});

		const response = await anthropic.generateText({
			model: 'claude-3-5-sonnet-20241022',
			prompt: 'Explain the concept of map, filter, and reduce in functional programming.',
			maxTokens: 300
		});

		const transformed = transformResponse(response);
		
		console.log('Original response length:', response.text.length);
		console.log('Word count:', transformed.wordCount);
		console.log('Summary:', transformed.summary);
		console.log('Efficiency ratio:', transformed.efficiency.toFixed(2));

	} catch (error) {
		console.error('Transformation example error:', error);
	}
}

// Main execution
async function main() {
	await functionalExample();
	await compositionExample();
	await transformationExample();
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch(console.error);
}
