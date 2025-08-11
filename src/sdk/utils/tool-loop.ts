import type { 
	LLMProviderWithTools,
	ToolLoopOptions,
	ToolLoopResult,
	MessageWithTool,
	ToolCall,
    ToolResponse
} from '../interfaces/tools.js';
import type { Message } from '../interfaces/messages.js';

/**
 * Executes a tool loop with the LLM provider, handling tool calls until completion
 * or maximum iterations are reached.
 * 
 * @param provider - The LLM provider that supports tools
 * @param options - Configuration options for the tool loop
 * @returns Promise that resolves to the final result with all messages and metadata
 */
export const executeToolLoop = async (
	provider: LLMProviderWithTools,
	options: ToolLoopOptions
): Promise<ToolLoopResult> => {
	const { onToolCall, maxToolCalls = 10, messages = [], ...chatOptions } = options;
	
	// Convert initial messages to MessageWithTool format
	const conversationMessages: MessageWithTool[] = messages.map(msg => ({
		...msg,
		role: msg.role as MessageWithTool['role']
	}));
	
	let toolCallCount = 0;
	let maxToolCallsReached = false;
	let finalResponse;

	while (toolCallCount < maxToolCalls) {
		// Generate chat response with tools
		const response = await provider.generateChatWithTools({
			...chatOptions,
			messages: conversationMessages,
			maxToolCalls
		});

		finalResponse = response;

		// If no tool calls were made, we're done
		if (!response.toolCalls || response.toolCalls.length === 0) {
			break;
		}

		// Add assistant's response with tool calls to conversation
		conversationMessages.push({
			role: 'assistant',
			content: response.text,
			toolCalls: response.toolCalls
		});

		// Process each tool call
		for (const toolCall of response.toolCalls) {
			toolCallCount++;

			// Check if we've reached the maximum
			if (toolCallCount >= maxToolCalls) {
				maxToolCallsReached = true;
				break;
			}

			try {
				// Execute the tool call if handler is provided
				let toolResult: ToolResponse | null = null;
				if (onToolCall) {
					toolResult = await onToolCall(toolCall);
				}

				// Add tool result to conversation
				conversationMessages.push({
					role: 'tool',
					content: typeof toolResult?.result === 'string' 
						? toolResult .result
						: JSON.stringify(toolResult?.result || 'Tool executed successfully'),
					toolCallId: toolCall.id,
					toolName: toolCall.name
				});
			} catch (error) {
				// Add error result to conversation
				conversationMessages.push({
					role: 'tool',
					content: `Error executing tool ${toolCall.name}: ${error instanceof Error ? error.message : String(error)}`,
					toolCallId: toolCall.id
				});
			}
		}

		// Break if we've reached the maximum tool calls
		if (maxToolCallsReached) {
			break;
		}
	}

	// If we exited the loop due to maxToolCalls, mark it
	if (toolCallCount >= maxToolCalls) {
		maxToolCallsReached = true;
	}

	// Convert conversation messages back to regular Message format for the result
	const resultMessages: Message[] = conversationMessages.map(msg => ({
		role: msg.role === 'tool' ? 'assistant' : msg.role as Message['role'],
		content: msg.content
	}));

	return {
		finalResponse: finalResponse!,
		toolCallCount,
		maxToolCallsReached,
		messages: resultMessages
	};
};
