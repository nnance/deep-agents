import { createOllamaProvider, createAnthropicProvider, type LLMProvider } from '../sdk/index.js';
import dotenv from 'dotenv';

dotenv.config();

// Test utility functions
const createTestOptions = (model: string) => ({
	model,
	prompt: 'Say hello in exactly 3 words',
	maxTokens: 10,
	systemPrompt: 'You are a helpful assistant'
});

// Pure function to validate response structure
const validateResponse = (response: any): boolean => {
	return (
		typeof response.text === 'string' &&
		response.text.length > 0 &&
		response.usage &&
		typeof response.usage.totalTokens === 'number'
	);
};

// Higher-order function for provider testing
const testProvider = (name: string) => async (provider: any, testModel: string) => {
	console.log(`\n=== Testing ${name} Provider ===`);
	
	try {
		// Test model listing (if available)
		if (provider.listModels) {
			const models = await provider.listModels();
			console.log(`✓ Available models: ${models.length > 0 ? models.slice(0, 3).join(', ') + '...' : 'None'}`);
		}
		
		// Test basic text generation
		const response = await provider.generateText(createTestOptions(testModel));
		const isValid = validateResponse(response);
		
		if (isValid) {
			console.log(`✓ Text generation successful`);
			console.log(`  Response: "${response.text.trim()}"`);
			console.log(`  Tokens used: ${response.usage?.totalTokens || 'unknown'}`);
		} else {
			console.log(`✗ Invalid response structure`);
		}
		
		return { success: true, response };
	} catch (error) {
		console.log(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		return { success: false, error };
	}
};

// Test Ollama provider
async function testOllama() {
	const testOllamaProvider = testProvider('Ollama');
	
	const ollama = createOllamaProvider({
		baseUrl: 'http://localhost:11434'
	});

	// Check if server is running first
	try {
		const isRunning = await ollama.isServerRunning();
		if (!isRunning) {
			console.log('\n=== Testing Ollama Provider ===');
			console.log('✗ Ollama server is not running on localhost:11434');
			console.log('  To test Ollama:');
			console.log('  1. Install Ollama from https://ollama.ai');
			console.log('  2. Run: ollama serve');
			console.log('  3. Pull a model: ollama pull llama2');
			return { success: false };
		}

		const models = await ollama.listModels();
		if (models.length === 0) {
			console.log('\n=== Testing Ollama Provider ===');
			console.log('✗ No models available');
			console.log('  Pull a model first: ollama pull llama2');
			return { success: false };
		}

		return await testOllamaProvider(ollama, models[0]!);
	} catch (error) {
		console.log('\n=== Testing Ollama Provider ===');
		console.log(`✗ Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		return { success: false };
	}
}

// Test Anthropic provider
async function testAnthropic() {
	const testAnthropicProvider = testProvider('Anthropic');
	
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey || apiKey === 'your-api-key-here') {
		console.log('\n=== Testing Anthropic Provider ===');
		console.log('✗ ANTHROPIC_API_KEY environment variable not set');
		console.log('  To test Anthropic:');
		console.log('  1. Get API key from https://console.anthropic.com');
		console.log('  2. Set: export ANTHROPIC_API_KEY="your-key-here"');
		return { success: false };
	}

	const anthropic = createAnthropicProvider({
		apiKey
	});

	return await testAnthropicProvider(anthropic, 'claude-3-5-haiku-20241022');
}

// Test functional composition
async function testFunctionalComposition() {
	console.log('\n=== Testing Functional Composition ===');
	
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey || apiKey === 'your-api-key-here') {
		console.log('⚠️  Skipping composition test (no Anthropic API key)');
		return { success: false };
	}

	try {
		const anthropic = createAnthropicProvider({ apiKey });

		// Higher-order function for adding metadata
		const withMetadata = (provider: LLMProvider) => ({
			...provider,
			generateWithMetadata: async (options: Parameters<LLMProvider['generateText']>[0]) => {
				const startTime = Date.now();
				const response = await provider.generateText(options);
				const endTime = Date.now();
				
				return {
					...response,
					metadata: {
						duration: endTime - startTime,
						timestamp: new Date().toISOString(),
						model: options.model
					}
				};
			}
		});

		const enhanced = withMetadata(anthropic);
		const result = await enhanced.generateWithMetadata(createTestOptions('claude-3-5-haiku-20241022'));

		console.log('✓ Functional composition working');
		console.log(`  Duration: ${result.metadata.duration}ms`);
		console.log(`  Model: ${result.metadata.model}`);

		return { success: true };
	} catch (error) {
		console.log(`✗ Composition test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		return { success: false };
	}
}

// Test pure functions
function testPureFunctions() {
	console.log('\n=== Testing Pure Functions ===');
	
	// Test response validation
	const validResponse = {
		text: 'Hello world',
		usage: { totalTokens: 5 }
	};
	
	const invalidResponse = {
		text: '',
		usage: null
	};

	const isValid1 = validateResponse(validResponse);
	const isValid2 = validateResponse(invalidResponse);

	console.log(`✓ Pure function validation: valid=${isValid1}, invalid=${isValid2}`);
	
	return { success: isValid1 && !isValid2 };
}

// Main test runner
async function runTests() {
	console.log('🧪 Running Deep Agents SDK Tests');
	console.log('='.repeat(40));

	const results = await Promise.allSettled([
		testOllama(),
		testAnthropic(),
		testFunctionalComposition()
	]);

	const pureTestResult = testPureFunctions();

	// Summary
	console.log('\n' + '='.repeat(40));
	console.log('📊 Test Summary');
	
	const allResults = [...results.map((r, i) => ({
		name: ['Ollama', 'Anthropic', 'Composition'][i],
		success: r.status === 'fulfilled' ? r.value.success : false
	})), {
		name: 'Pure Functions',
		success: pureTestResult.success
	}];

	allResults.forEach(result => {
		console.log(`${result.success ? '✓' : '✗'} ${result.name}`);
	});

	const successCount = allResults.filter(r => r.success).length;
	console.log(`\n${successCount}/${allResults.length} tests passed`);
	
	if (successCount === allResults.length) {
		console.log('🎉 All tests passed!');
	} else {
		console.log('⚠️  Some tests failed or were skipped');
	}
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	runTests().catch(console.error);
}

export { runTests, testOllama, testAnthropic, testFunctionalComposition };
