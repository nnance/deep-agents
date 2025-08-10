# Anthropic Provider Zod Integration

This document describes the Zod schema validation implementation for the Anthropic provider.

## Overview

The Anthropic provider has been updated to use [Zod](https://zod.dev/) for runtime validation of API responses. This ensures type safety and proper error handling when parsing responses from the Anthropic API.

## Files

### `anthropic-schemas.ts`
Contains all Zod schemas and TypeScript interfaces for validating Anthropic API responses:

- **`UsageSchema`**: Validates token usage information (input_tokens, output_tokens)
- **`ContentBlockSchema`**: Validates content blocks in non-streaming responses
- **`MessageResponseSchema`**: Validates complete message responses from the API
- **`StreamDeltaSchema`**: Validates delta content in streaming responses
- **`StreamChunkSchema`**: Validates individual chunks in streaming responses
- **`ModelSchema`**: Validates model objects in the models list
- **`ModelsResponseSchema`**: Validates the complete models list response

### `anthropic.ts`
Updated to use Zod validation in three key areas:

1. **Non-streaming responses**: Validates the complete message response structure
2. **Streaming responses**: Validates each chunk of streaming data
3. **Models list**: Validates the models list API response

## Validation Strategy

The implementation follows a defensive programming approach:

- **Graceful degradation**: If validation fails, the provider falls back to known models list or throws descriptive errors
- **Type safety**: All API responses are now properly typed using interfaces derived from Zod schemas
- **Selective validation**: Only validates the parts of the API response that are actually used by the provider
- **Error reporting**: Zod validation errors include detailed information about what went wrong

## Benefits

1. **Runtime type safety**: Catches API format changes at runtime
2. **Better error messages**: Clear validation errors when API responses are malformed
3. **Type inference**: TypeScript interfaces are automatically derived from schemas
4. **Maintainability**: Schema changes automatically update both validation and types
5. **Reliability**: Prevents runtime errors from unexpected API response formats

## Usage

The Zod validation is transparent to consumers of the provider. All existing functionality continues to work as before, but with added runtime validation and better error handling.

```typescript
import { createAnthropicProvider } from './providers/anthropic.js';

const provider = createAnthropicProvider({
  apiKey: 'your-api-key'
});

// All methods now include automatic response validation
const response = await provider.generateText({
  model: 'claude-3-sonnet-20240229',
  prompt: 'Hello, world!'
});
```
