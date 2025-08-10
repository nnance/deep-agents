# Ollama Provider Zod Integration

This document describes the Zod schema validation implementation for the Ollama provider.

## Overview

The Ollama provider has been updated to use [Zod](https://zod.dev/) for runtime validation of API responses. This ensures type safety and proper error handling when parsing responses from the Ollama API.

## Files

### `ollama-schemas.ts`
Contains all Zod schemas and TypeScript interfaces for validating Ollama API responses:

- **`GenerationResponseSchema`**: Validates non-streaming generation responses (response text and token counts)
- **`StreamChunkSchema`**: Validates individual chunks in streaming responses
- **`ModelSchema`**: Validates model objects in the models list
- **`ModelsResponseSchema`**: Validates the complete models list response

### `ollama.ts`
Updated to use Zod validation in three key areas:

1. **Non-streaming responses**: Validates the complete generation response structure
2. **Streaming responses**: Validates each chunk of streaming data
3. **Models list**: Validates the models list API response

## Validation Strategy

The implementation follows a defensive programming approach:

- **Graceful degradation**: If validation fails, the provider returns empty arrays for models list or throws descriptive errors for generation
- **Type safety**: All API responses are now properly typed using interfaces derived from Zod schemas
- **Selective validation**: Only validates the parts of the API response that are actually used by the provider
- **Error reporting**: Zod validation errors include detailed information about what went wrong

## Ollama-Specific Features

The Ollama provider validation handles the unique aspects of the Ollama API:

- **Token counting**: Validates `prompt_eval_count` and `eval_count` fields for usage statistics
- **Streaming completion**: Validates the `done` field to detect when streaming is complete
- **Model names**: Validates the models array structure from the `/api/tags` endpoint
- **Response text**: Validates the `response` field containing the generated text

## Benefits

1. **Runtime type safety**: Catches API format changes at runtime
2. **Better error messages**: Clear validation errors when API responses are malformed
3. **Type inference**: TypeScript interfaces are automatically derived from schemas
4. **Maintainability**: Schema changes automatically update both validation and types
5. **Reliability**: Prevents runtime errors from unexpected API response formats

## Usage

The Zod validation is transparent to consumers of the provider. All existing functionality continues to work as before, but with added runtime validation and better error handling.

```typescript
import { createOllamaProvider } from './providers/ollama.js';

const provider = createOllamaProvider({
  baseUrl: 'http://localhost:11434'
});

// All methods now include automatic response validation
const response = await provider.generateText({
  model: 'llama2',
  prompt: 'Hello, world!'
});
```

## Differences from Anthropic Provider

While the implementation pattern is similar to the Anthropic provider, the Ollama schemas reflect the differences in API structure:

- **Simpler response format**: Ollama responses are generally less nested than Anthropic's
- **Different token fields**: Uses `prompt_eval_count` and `eval_count` instead of `input_tokens` and `output_tokens`
- **Streaming indicators**: Uses `done` boolean field to indicate completion of streaming
- **Model structure**: Models list has a simpler structure with just `name` field
