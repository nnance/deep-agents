import { createOllamaProvider, createAnthropicProvider, type LLMProviderWithMessages } from '../sdk/index.js';
import dotenv from 'dotenv';

dotenv.config();

// Test the new LLMProviderWithMessages interface implementation
async function testChatCompletion() {
	console.log('🧪 Testing LLMProviderWithMessages Implementation');
	console.log('='.repeat(50));

	// Test options with messages
	const chatOptions = {
		model: '',
		messages: [
			{ role: 'system' as const, content: 'You are a helpful assistant that responds briefly.' },
			{ role: 'user' as const, content: 'What is 2+2?' },
			{ role: 'assistant' as const, content: '2+2 equals 4.' },
			{ role: 'user' as const, content: 'And what is 4+4?' }
		],
		maxTokens: 50
	};

	// Test options with just a prompt
	const promptOptions = {
		model: '',
		prompt: 'What is the capital of France? Answer in one word.',
		maxTokens: 10
	};

	// Test Anthropic if API key is available
	const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
	if (anthropicApiKey && anthropicApiKey !== 'your-api-key-here') {
		console.log('\n=== Testing Anthropic Chat Completion ===');
		
		try {
			const anthropic = createAnthropicProvider({ apiKey: anthropicApiKey });
			
			// Test with messages
			const chatResponse = await anthropic.generateChatCompletion({
				...chatOptions,
				model: 'claude-3-5-haiku-20241022'
			});
			
			console.log('✓ Chat completion with messages:');
			console.log(`  Response: "${chatResponse.text.trim()}"`);
			console.log(`  Tokens: ${chatResponse.usage?.totalTokens || 'unknown'}`);

			// Test with prompt
			const promptResponse = await anthropic.generateChatCompletion({
				...promptOptions,
				model: 'claude-3-5-haiku-20241022'
			});
			
			console.log('✓ Chat completion with prompt:');
			console.log(`  Response: "${promptResponse.text.trim()}"`);
			console.log(`  Tokens: ${promptResponse.usage?.totalTokens || 'unknown'}`);

		} catch (error) {
			console.log(`✗ Anthropic test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	} else {
		console.log('\n⚠️  Skipping Anthropic tests (no API key)');
	}

	// Test Ollama if server is running
	console.log('\n=== Testing Ollama Chat Completion ===');
	
	try {
		const ollama = createOllamaProvider();
		const isRunning = await ollama.isServerRunning();
		
		if (!isRunning) {
			console.log('⚠️  Ollama server not running - skipping tests');
			return;
		}

		const models = await ollama.listModels();
		if (models.length === 0) {
			console.log('⚠️  No Ollama models available - skipping tests');
			return;
		}

		const testModel = models[0]!;
		console.log(`Using model: ${testModel}`);

		// Test with messages
		const chatResponse = await ollama.generateChatCompletion({
			...chatOptions,
			model: testModel
		});
		
		console.log('✓ Chat completion with messages:');
		console.log(`  Response: "${chatResponse.text.trim()}"`);
		console.log(`  Tokens: ${chatResponse.usage?.totalTokens || 'unknown'}`);

		// Test with prompt
		const promptResponse = await ollama.generateChatCompletion({
			...promptOptions,
			model: testModel
		});
		
		console.log('✓ Chat completion with prompt:');
		console.log(`  Response: "${promptResponse.text.trim()}"`);
		console.log(`  Tokens: ${promptResponse.usage?.totalTokens || 'unknown'}`);

	} catch (error) {
		console.log(`✗ Ollama test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

// Test interface compatibility
function testInterfaceCompatibility() {
	console.log('\n=== Testing Interface Compatibility ===');
	
	// This should compile without errors
	const testProvider = (provider: LLMProviderWithMessages) => {
		// Both methods should be available
		return {
			hasGenerateText: typeof provider.generateText === 'function',
			hasGenerateChatCompletion: typeof provider.generateChatCompletion === 'function'
		};
	};

	if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your-api-key-here') {
		const anthropic = createAnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY });
		const anthropicCompatibility = testProvider(anthropic);
		console.log('✓ Anthropic implements LLMProviderWithMessages:', anthropicCompatibility);
	}

	const ollama = createOllamaProvider();
	const ollamaCompatibility = testProvider(ollama);
	console.log('✓ Ollama implements LLMProviderWithMessages:', ollamaCompatibility);
}

// Main execution
async function main() {
	testInterfaceCompatibility();
	await testChatCompletion();
	
	console.log('\n🎉 All tests completed!');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch(console.error);
}

export { testChatCompletion, testInterfaceCompatibility };
