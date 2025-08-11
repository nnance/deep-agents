# Tool Loop Utility

The `executeToolLoop` utility function provides a robust way to handle tool execution with LLM providers that support the `generateChatWithTools` interface.

## Overview

This utility manages the complete cycle of:
1. Sending messages to the LLM with available tools
2. Processing any tool calls requested by the LLM
3. Executing the tools and adding results back to the conversation
4. Continuing the loop until the LLM completes or max iterations are reached

## Usage

```typescript
import { executeToolLoop, type LLMProviderWithTools, type Tool } from '@your-org/deep-agents';

// Define your tools
const tools: Tool[] = [
  {
    name: 'get_weather',
    description: 'Get current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City and state' }
      },
      required: ['location']
    }
  }
];

// Execute the tool loop
const result = await executeToolLoop(provider, {
  model: 'your-model',
  messages: [
    { role: 'user', content: 'What\'s the weather in San Francisco?' }
  ],
  tools,
  maxToolCalls: 10,
  onToolCall: async (toolCall) => {
    // Your tool execution logic here
    const { name, arguments: args } = toolCall;
    
    if (name === 'get_weather') {
      const location = args.location as string;
      // Call your weather API
      return `Weather in ${location}: 72°F, sunny`;
    }
    
    return 'Unknown tool';
  }
});

console.log('Final response:', result.finalResponse.text);
console.log('Tool calls made:', result.toolCallCount);
```

## Parameters

### `provider: LLMProviderWithTools`
The LLM provider that implements the `generateChatWithTools` method.

### `options: ToolLoopOptions`
Configuration object with the following properties:

- **`model`** (string): The model to use for generation
- **`messages`** (MessageWithTool[]): Initial conversation messages
- **`tools`** (Tool[]): Available tools for the LLM to use
- **`maxToolCalls`** (number, default: 10): Maximum number of tool calls allowed
- **`onToolCall`** ((toolCall: ToolCall) => Promise<unknown>): Handler for executing tool calls
- **`maxTokens`** (number, optional): Maximum tokens to generate
- **`systemPrompt`** (string, optional): System prompt for the model

## Return Value

Returns a `ToolLoopResult` object containing:

- **`finalResponse`** (ChatWithToolsResponse): The final response from the LLM
- **`toolCallCount`** (number): Total number of tool calls executed
- **`maxToolCallsReached`** (boolean): Whether the max limit was reached
- **`messages`** (Message[]): Complete conversation history

## Error Handling

The utility includes built-in error handling:

- Tool execution errors are captured and added to the conversation
- The loop continues even if individual tools fail
- Network errors or provider errors will bubble up as exceptions

## Best Practices

1. **Set reasonable limits**: Use `maxToolCalls` to prevent infinite loops
2. **Handle tool errors gracefully**: Your `onToolCall` handler should catch and return meaningful error messages
3. **Validate tool arguments**: Always validate arguments passed to your tools
4. **Use appropriate models**: Ensure your model supports tool calling
5. **Monitor token usage**: Keep track of token consumption for cost management

## Example with Error Handling

```typescript
const result = await executeToolLoop(provider, {
  model: 'claude-3-5-sonnet-20241022',
  messages: [{ role: 'user', content: 'Help me with calculations' }],
  tools: [calculatorTool],
  maxToolCalls: 5,
  onToolCall: async (toolCall) => {
    try {
      // Validate arguments
      if (!toolCall.arguments.expression) {
        return 'Error: No expression provided';
      }
      
      // Execute tool safely
      const result = await safeCalculate(toolCall.arguments.expression);
      return `Result: ${result}`;
    } catch (error) {
      return `Calculation error: ${error.message}`;
    }
  }
});
```

## Integration with Providers

This utility works with any provider that implements the `LLMProviderWithTools` interface. Currently supported providers:

- Anthropic Claude (when extended with tools support)
- Ollama (when extended with tools support)

To use with your provider, ensure it implements:

```typescript
interface LLMProviderWithTools extends LLMProviderWithMessages {
  generateChatWithTools(options: ChatWithToolsOptions): Promise<ChatWithToolsResponse>;
}
```
