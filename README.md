# Deep Agents

A project to research architecture patterns that allow long running agents with complex goals to plan and act over longer periods of time.  

This is a TypeScript Node.js project for exploring AI agents with no dependencies on AI frameworks or libraries.

## Features

### Core LLM Support
- **Multiple Provider Support**: Anthropic Claude and Ollama
- **Unified Interface**: Consistent API across different LLM providers
- **Type Safety**: Full TypeScript support with runtime validation using Zod
- **Streaming Support**: Real-time response streaming where supported

### Tool Integration
- **Tool Execution Loop**: Automated tool calling and response handling
- **Provider Agnostic**: Works with both Anthropic and Ollama providers
- **Error Handling**: Robust error handling for tool execution failures
- **Configurable Limits**: Prevent infinite loops with configurable max tool calls

### SDK Structure
```
src/sdk/
├── interfaces/     # TypeScript interfaces and types
├── providers/      # LLM provider implementations
├── utils/          # Utility functions (tool loop execution)
└── index.ts        # Main SDK exports
```

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation
```bash
npm install
```

### Development
```bash
# Run TypeScript directly (development mode)
npm run dev

# Build the project
npm run build

# Run compiled JavaScript
npm start
```

## Usage Examples

### Basic LLM Usage

```typescript
import { createAnthropicProvider, createOllamaProvider } from './sdk/index.js';

// Anthropic Claude
const anthropic = createAnthropicProvider({
  apiKey: 'your-api-key'
});

const response = await anthropic.generateChatCompletion({
  model: 'claude-3-5-sonnet-20241022',
  messages: [
    { role: 'user', content: 'Hello, world!' }
  ]
});

// Ollama
const ollama = createOllamaProvider({
  baseUrl: 'http://localhost:11434'
});

const response2 = await ollama.generateChatCompletion({
  model: 'llama3.1',
  messages: [
    { role: 'user', content: 'Hello, world!' }
  ]
});
```

### Tool Integration

```typescript
import { executeToolLoop, type Tool } from './sdk/index.js';

// Define tools
const tools: Tool[] = [
  {
    name: 'calculator',
    description: 'Perform mathematical calculations',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Math expression' }
      },
      required: ['expression']
    }
  }
];

// Execute tool loop
const result = await executeToolLoop(provider, {
  model: 'claude-3-5-sonnet-20241022',
  messages: [
    { role: 'user', content: 'What is 15 + 27?' }
  ],
  tools,
  maxToolCalls: 10,
  onToolCall: async (toolCall) => {
    // Your tool execution logic
    if (toolCall.name === 'calculator') {
      const result = eval(toolCall.arguments.expression);
      return `Result: ${result}`;
    }
    return 'Unknown tool';
  }
});
```

## Project Structure
- `src/sdk/` - Core SDK implementation
  - `interfaces/` - TypeScript interfaces and types
  - `providers/` - LLM provider implementations
  - `utils/` - Utility functions
- `src/examples/` - Usage examples and test files
- `dist/` - Compiled JavaScript output
- `package.json` - Project configuration and dependencies
- `tsconfig.json` - TypeScript configuration

## Scripts
- `npm run dev` - Run TypeScript with ts-node (development)
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled JavaScript application

## Provider Support

### Anthropic Claude
- Text generation and chat completion
- Native tool calling support
- Streaming responses
- Full API compatibility

### Ollama
- Local model support
- Text generation and chat completion
- Tool calling support with automatic fallback
  - Attempts native tool API first
  - Falls back to instruction-based approach if tools API unavailable
- Streaming responses

**Note**: Ollama's tool support varies by version. The implementation automatically detects if the tools API is available and falls back to an instruction-based approach for maximum compatibility.

## Contributing

This project is focused on research and experimentation with AI agent architectures. Feel free to explore and contribute new patterns and approaches.
