import { createOllamaProvider } from '../sdk/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function functionalExample() {
	console.log('=== Functional Programming Style ===');
	
	// Create an Ollama provider using functional approach
	const ollama = createOllamaProvider({
		baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
	});

	try {
		// Check if Ollama server is running
		const isRunning = await ollama.isServerRunning();
		if (!isRunning) {
			console.log('Ollama server is not running. Please start Ollama first.');
			return;
		}

		// List available models
		const models = await ollama.listModels();
		console.log('Available models:', models);

		if (models.length === 0) {
			console.log('No models available. Please pull a model first (e.g., ollama pull llama2)');
			return;
		}

		// Generate text using the first available model
		const response = await ollama.generateText({
			model: models[0]!,
			prompt: 'Explain what functional programming is in simple terms.',
			maxTokens: 200,
			systemPrompt: 'You are a helpful programming tutor that explains concepts clearly.'
		});

		console.log('Generated response:', response.text);
		console.log('Token usage:', response.usage);

	} catch (error) {
		console.error('Error:', error);
	}
}

// Demonstrate functional composition
const composeProviderOperations = (provider: ReturnType<typeof createOllamaProvider>) => ({
	generateWithHealthCheck: async (options: Parameters<typeof provider.generateText>[0]) => {
		const isHealthy = await provider.isServerRunning();
		if (!isHealthy) {
			throw new Error('Server is not running');
		}
		return provider.generateText(options);
	},
	
	generateWithModelValidation: async (options: Parameters<typeof provider.generateText>[0]) => {
		const models = await provider.listModels();
		if (!models.includes(options.model)) {
			throw new Error(`Model ${options.model} is not available. Available models: ${models.join(', ')}`);
		}
		return provider.generateText(options);
	}
});

async function compositionExample() {
	console.log('\n=== Functional Composition Example ===');
	
	const baseProvider = createOllamaProvider();
	const enhancedProvider = composeProviderOperations(baseProvider);
	
	try {
		const models = await baseProvider.listModels();
		if (models.length === 0) {
			console.log('No models available for composition example');
			return;
		}

		// Use enhanced provider with built-in validations
		const response = await enhancedProvider.generateWithModelValidation({
			model: models[0]!,
			prompt: 'What are the benefits of functional composition?',
			maxTokens: 150
		});

		console.log('Enhanced provider response:', response.text);
	} catch (error) {
		console.error('Composition error:', error);
	}
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	Promise.all([
		functionalExample(),
		compositionExample()
	]).catch(console.error);
}
