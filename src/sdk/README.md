# Generative AI SDK

This folder contains the API interface and integration to different LLM Providers and Models. The SDK is designed to generate a response from the LLM based on prompt or a set of chat messages.

The goal of this SDK is to avoid any external AI Framework or LLM client dependencies and integrate directly with the REST API of each provider using **functional programming principles**.

## Design Philosophy

This SDK follows functional programming principles:

- **Pure Functions**: All transformation and parsing functions are pure (no side effects)
- **Immutability**: Objects are not mutated; new objects are created for transformations
- **Composition**: Higher-order functions and function composition for building complex functionality
- **Error Handling**: Functional error handling patterns with wrapper functions

## Interfaces

The interfaces folder contains the TypeScript interface definition of a common API for multiple LLM Providers:

- `LLMProvider`: Base interface that all providers implement
- `TextGenerationOptions`: Configuration for text generation requests
- `TextGenerationResponse`: Standardized response format with text and usage information

## Providers

The providers folder contains the implementation of each provider that follows the TypeScript interfaces. Each provider uses functional programming patterns and integrates directly with the REST API:

### [Ollama](./providers/ollama.md)
- **API Reference**: [Ollama REST API](https://raw.githubusercontent.com/ollama/ollama/refs/heads/main/docs/api.md)
- **Models**: Local models (llama2, codellama, mistral, etc.)
- **Features**: Local inference, model management, streaming support
- **Use Case**: Privacy-focused local development and experimentation

### [Anthropic](./providers/anthropic.md)
- **API Reference**: [Anthropic Messages API](https://docs.anthropic.com/en/api/messages.md)
- **Models**: Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus, etc.
- **Features**: High-quality text generation, streaming support, system prompts
- **Use Case**: Production applications requiring sophisticated reasoning

## Usage Examples

### Basic Usage

```typescript
import { createOllamaProvider, createAnthropicProvider } from './sdk/index.js';

// Ollama (Local)
const ollama = createOllamaProvider({
    baseUrl: 'http://localhost:11434'
});

// Anthropic (Cloud)
const anthropic = createAnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY!
});

// Both providers implement the same interface
const response = await ollama.generateText({
    model: 'llama2',
    prompt: 'Explain functional programming',
    maxTokens: 200
});
```

### Functional Composition

```typescript
// Compose additional functionality using higher-order functions
const enhanceProvider = (provider) => ({
    ...provider,
    generateWithRetry: (maxRetries = 3) => async (options) => {
        // Retry logic implementation
    },
    generateWithValidation: async (options) => {
        // Model validation logic
    }
});

const enhanced = enhanceProvider(anthropic);
```

### Provider Abstraction

```typescript
// Write provider-agnostic code
const generateResponse = async (provider: LLMProvider, prompt: string) => {
    return provider.generateText({
        model: await getPreferredModel(provider),
        prompt,
        maxTokens: 150
    });
};

// Works with any provider
const ollamaResponse = await generateResponse(ollama, 'Hello world');
const anthropicResponse = await generateResponse(anthropic, 'Hello world');
```

## Functional Programming Features

### Pure Functions
- Request body creation
- Response parsing and transformation
- Data accumulation and aggregation

### Higher-Order Functions
- Error handling wrappers (`withErrorHandling`)
- Request factory functions (`makeRequest`)
- Functional composition utilities

### Immutability
- Configuration objects are never mutated
- Response transformations create new objects
- Provider instances maintain immutable state

## Error Handling

All providers use consistent functional error handling:

```typescript
// Built-in error handling
try {
    const response = await provider.generateText(options);
} catch (error) {
    console.error('Generation failed:', error.message);
}

// Check service availability
const isAvailable = await provider.isServiceAvailable?.() || 
                   await provider.isServerRunning?.();
```

## Factory Pattern

Each provider uses a factory function pattern for creation:

```typescript
// Factory functions return configured provider instances
const provider = createProviderType(config);

// Providers are immutable and stateless
const response1 = await provider.generateText(options1);
const response2 = await provider.generateText(options2);
```   