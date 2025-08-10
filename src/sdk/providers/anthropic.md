# Anthropic Provider

The Anthropic provider allows you to use Claude models through the Anthropic API. Claude is a family of large language models developed by Anthropic.

This provider is implemented using **functional programming principles** with pure functions, composition, and immutability.

## Prerequisites

1. Sign up for an Anthropic account at [https://console.anthropic.com](https://console.anthropic.com)
2. Generate an API key from your Anthropic console
3. Set your API key as an environment variable or pass it directly to the provider

## Usage

### Functional Approach

```typescript
import { createAnthropicProvider } from './sdk/index.js';

// Create provider using functional factory
const anthropic = createAnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY!, // Required
    baseUrl: 'https://api.anthropic.com', // Optional, defaults to official API
    version: '2023-06-01' // Optional, defaults to latest stable version
});

// All operations are pure functions that return promises
const isAvailable = await anthropic.isServiceAvailable();
const models = await anthropic.listModels();

const response = await anthropic.generateText({
    model: 'claude-3-5-sonnet-20241022',
    prompt: 'Explain quantum computing in simple terms',
    maxTokens: 500,
    systemPrompt: 'You are a helpful science tutor who explains complex topics clearly',
    stream: false
});
```

### Functional Composition

```typescript
// Compose additional functionality using higher-order functions
const enhanceProvider = (provider) => ({
    ...provider,
    generateWithValidation: async (options) => {
        const models = await provider.listModels();
        if (!models.includes(options.model)) {
            throw new Error(`Model ${options.model} not available`);
        }
        return provider.generateText(options);
    },
    
    generateWithRetry: (maxRetries = 3) => async (options) => {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await provider.generateText(options);
            } catch (error) {
                lastError = error;
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                }
            }
        }
        throw lastError;
    }
});

const enhanced = enhanceProvider(anthropic);
```

### Streaming Support

```typescript
// Enable streaming for real-time responses
const streamingResponse = await anthropic.generateText({
    model: 'claude-3-5-sonnet-20241022',
    prompt: 'Write a short story about a robot learning to paint',
    maxTokens: 1000,
    stream: true // Enable streaming
});

console.log(streamingResponse.text); // Contains the complete streamed response
```

## Available Models

The provider supports all current Claude models:

- `claude-3-5-sonnet-20241022` - Most capable model, best for complex tasks
- `claude-3-5-haiku-20241022` - Fast and efficient for simpler tasks
- `claude-3-opus-20240229` - Most capable Claude 3 model
- `claude-3-sonnet-20240229` - Balanced performance and speed
- `claude-3-haiku-20240307` - Fastest Claude 3 model

## Configuration Options

```typescript
interface AnthropicConfig {
    apiKey: string;        // Required: Your Anthropic API key
    baseUrl?: string;      // Optional: Custom API endpoint
    version?: string;      // Optional: API version (defaults to '2023-06-01')
}
```

## Error Handling

The provider uses functional error handling patterns:

```typescript
// Error handling is built into all methods
try {
    const response = await anthropic.generateText({
        model: 'claude-3-5-sonnet-20241022',
        prompt: 'Hello, world!'
    });
} catch (error) {
    console.error('Generation failed:', error.message);
}

// Check service availability before making requests
const isAvailable = await anthropic.isServiceAvailable();
if (!isAvailable) {
    console.log('Anthropic service is not available');
}
```

## Functional Programming Features

### Pure Functions
- All transformation functions are pure (no side effects)
- Request building, response parsing, and data transformation are isolated
- Functions return new objects rather than mutating existing ones

### Higher-Order Functions
- `withErrorHandling` wrapper for consistent error management
- `makeRequest` factory for creating configured request functions
- Easy composition of additional functionality

### Immutability
- Configuration objects are not mutated
- Response transformations create new objects
- Functional composition preserves original provider instance

## Environment Variables

```bash
# Set your Anthropic API key
export ANTHROPIC_API_KEY="your-api-key-here"

# Optional: Custom base URL
export ANTHROPIC_BASE_URL="https://api.anthropic.com"
```

## Rate Limiting

Anthropic has rate limits based on your subscription tier. The provider doesn't implement rate limiting internally, but you can compose rate limiting functionality:

```typescript
const rateLimited = (provider, requestsPerMinute = 60) => {
    let lastRequest = 0;
    const interval = 60000 / requestsPerMinute;
    
    return {
        ...provider,
        generateText: async (options) => {
            const now = Date.now();
            const timeToWait = interval - (now - lastRequest);
            
            if (timeToWait > 0) {
                await new Promise(resolve => setTimeout(resolve, timeToWait));
            }
            
            lastRequest = Date.now();
            return provider.generateText(options);
        }
    };
};

const throttled = rateLimited(anthropic, 30); // 30 requests per minute
```
