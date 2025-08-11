import { 
	createAnthropicProvider, 
	createOllamaProvider, 
	executeToolLoop,
	type Tool,
    type ToolCall
} from '../sdk/index.js';
import dotenv from 'dotenv';

dotenv.config();

// Example tools for testing
const tools: Tool[] = [
	{
		name: 'calculate',
		description: 'Perform mathematical calculations',
		parameters: {
			type: 'object',
			properties: {
				expression: {
					type: 'string',
					description: 'Mathematical expression to evaluate'
				}
			},
			required: ['expression']
		}
	},
	{
		name: 'get_time',
		description: 'Get the current time',
		parameters: {
			type: 'object',
			properties: {},
			required: []
		}
	}
];

// Simple tool handler
const handleToolCall = async (toolCall: ToolCall) => {
	switch (toolCall.name) {
		case 'calculate':
			try {
				const result = eval((toolCall.arguments as { expression: string }).expression);
				return {
                    id: toolCall.id,
                    name: toolCall.name,
                    result: `The result is: ${result}`
                };
			} catch (error) {
				return {
                    id: toolCall.id,
                    name: toolCall.name,
                    result: `Error: ${error}`
                };
			}
		case 'get_time':
			return {
                id: toolCall.id,
                name: toolCall.name,
                result: `Current time: ${new Date().toISOString()}`
            };
		default:
			return {
                id: toolCall.id,
                name: toolCall.name,
                result: `Unknown tool: ${toolCall.name}`
            };
	}
};

// Test with Anthropic
async function testAnthropicTools() {
	console.log('Testing Anthropic tools...');
	
	const provider = createAnthropicProvider({
		apiKey: process.env.ANTHROPIC_API_KEY || 'test-key'
	});

	try {
		const result = await executeToolLoop(provider, {
			model: 'claude-3-5-sonnet-20241022',
			messages: [
				{
					role: 'user',
					content: 'What is 15 + 27? Also, what time is it?'
				}
			],
			tools,
			maxToolCalls: 5,
			onToolCall: handleToolCall
		});

		console.log('Anthropic Result:', result.finalResponse.text);
		console.log('Tool calls made:', result.toolCallCount);
	} catch (error) {
		console.error('Anthropic test error:', error);
	}
}

// Test with Ollama
async function testOllamaTools() {
	console.log('Testing Ollama tools...');
	
	const provider = createOllamaProvider({
		baseUrl: 'http://localhost:11434'
	});

	try {
		const result = await executeToolLoop(provider, {
			model: 'qwen3:30b',
			messages: [
				{
					role: 'user',
					content: 'Calculate 25 * 4 and tell me the current time'
				}
			],
			tools,
			maxToolCalls: 5,
			onToolCall: handleToolCall
		});

		console.log('Ollama Result:', result.finalResponse.text);
		console.log('Tool calls made:', result.toolCallCount);
	} catch (error) {
		console.error('Ollama test error:', error);
	}
}

// Test direct tools calls (without executeToolLoop)
async function testDirectToolCalls() {
	console.log('Testing direct tool calls...');
	
	const anthropicProvider = createAnthropicProvider({
		apiKey: process.env.ANTHROPIC_API_KEY || 'test-key'
	});

	try {
		const response = await anthropicProvider.generateChatWithTools({
			model: 'claude-3-5-sonnet-20241022',
			messages: [
				{
					role: 'user',
					content: 'What is 10 + 5?'
				}
			],
			tools: [tools[0]!] // Just the calculator tool
		});

		console.log('Direct call response:', response.text);
		console.log('Tool calls requested:', response.toolCalls);
	} catch (error) {
		console.error('Direct call error:', error);
	}
}

// Run tests
async function runTests() {
	console.log('=== Testing Tool Support ===\n');
	
	await testDirectToolCalls();
	console.log('\n---\n');
	
	// Test with actual servers (comment out if not available)
	// await testAnthropicTools();
	// console.log('\n---\n');
	await testOllamaTools();
}

runTests().catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
});
