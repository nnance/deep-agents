# Ollama Provider

The Ollama provider allows you to use local LLM models through the Ollama API. Ollama enables you to run large language models locally on your machine.

This provider is implemented using **functional programming principles** with pure functions, composition, and immutability.

## Prerequisites

1. Install Ollama from [https://ollama.ai](https://ollama.ai)
2. Start the Ollama server (usually runs on `http://localhost:11434`)
3. Pull at least one model, for example:
   ```bash
   ollama pull llama2
   ```

## Usage

### Functional Approach

```typescript
import { createOllamaProvider } from './sdk/index.js';

// Create provider using functional factory
const ollama = createOllamaProvider({
    baseUrl: 'http://localhost:11434' // Optional, defaults to localhost:11434
});

// All operations are pure functions that return promises
const isRunning = await ollama.isServerRunning();
const models = await ollama.listModels();

const response = await ollama.generateText({
    model: 'llama2',
    prompt: 'Explain quantum computing',
    maxTokens: 200,
    systemPrompt: 'You are a helpful science tutor',
    stream: false
});
```

### Functional Composition

```typescript
// Compose additional functionality using higher-order functions
const enhanceProvider = (provider) => ({
    generateWithValidation: async (options) => {
        const models = await provider.listModels();
        if (!models.includes(options.model)) {
            throw new Error(`Model ${options.model} not available`);
        }
        return provider.generateText(options);
    }
});

const baseProvider = createOllamaProvider();
const enhancedProvider = enhanceProvider(baseProvider);
```

## Configuration

The `OllamaConfig` interface supports:

- `baseUrl`: The base URL of the Ollama server (default: 'http://localhost:11434')

## Features

- ✅ **Functional Programming Style**: Pure functions, composition, and immutability
- ✅ **Higher-Order Functions**: Error handling wrappers and composition utilities
- ✅ **Pure Functions**: Predictable behavior with no side effects
- ✅ Text generation with configurable models
- ✅ System prompts support
- ✅ Token limits (maxTokens)
- ✅ Streaming and non-streaming responses
- ✅ Token usage statistics
- ✅ Server health checks
- ✅ Model listing
- ✅ Comprehensive error handling

## Functional Programming Benefits

1. **Pure Functions**: All core logic uses pure functions for predictable behavior
2. **Composition**: Easy to combine and extend functionality
3. **Immutability**: Data transformations don't mutate original objects
4. **Error Handling**: Wrapped with higher-order functions for consistent error management
5. **Testability**: Pure functions are easier to test and reason about

## Architecture

The provider is built using functional programming patterns:

- **Factory Function**: `createOllamaProvider()` creates provider instances
- **Pure Functions**: Request building, response parsing, data transformation
- **Higher-Order Functions**: Error handling, request wrapping, composition
- **Function Composition**: Combine multiple operations seamlessly

## Supported Models

Any model that you have pulled locally with Ollama, including:

- llama2, llama3, llama3.1, llama3.2
- mistral, mixtral
- codellama
- phi, phi3
- qwen, qwen2
- gemma, gemma2
- And many others

Run `ollama list` in your terminal to see locally available models.

## Error Handling

The provider includes comprehensive error handling for:

- Server connectivity issues
- Invalid model names
- API response errors
- Network timeouts
- Malformed responses

## API Response Validation

The Ollama provider includes built-in response validation using [Zod](https://zod.dev/) to ensure type safety and proper error handling. This validation is transparent to users but provides additional reliability.

For detailed information about the validation implementation, see [Ollama Zod Integration](./ollama-zod-integration.md).

Key benefits:
- **Runtime type safety**: Catches API format changes automatically
- **Better error messages**: Clear validation errors for malformed responses  
- **Graceful degradation**: Returns empty arrays if validation fails for model lists
- **Zero breaking changes**: Existing code continues to work without modification

## API Reference

See the `LLMProvider` interface in `interfaces/providers.ts` for the complete API specification.
