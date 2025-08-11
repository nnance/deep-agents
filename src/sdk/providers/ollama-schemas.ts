import { z } from 'zod';

// Schema for non-streaming generation response
export const GenerationResponseSchema = z.object({
  response: z.string().optional(),
  prompt_eval_count: z.number().optional(),
  eval_count: z.number().optional(),
});

// Schema for streaming response chunks
export const StreamChunkSchema = z.object({
  response: z.string().optional(),
  done: z.boolean().optional(),
  prompt_eval_count: z.number().optional(),
  eval_count: z.number().optional(),
});

// Schema for tool call in response
export const OllamaToolCallSchema = z.object({
  function: z.object({
    name: z.string(),
    arguments: z.record(z.string(), z.any()), // JSON string in Ollama format
  }),
});

// Schema for chat message in response (extended for tools)
export const ChatMessageSchema = z.object({
  role: z.string(),
  content: z.string().optional(),
  tool_name: z.string().optional(),
  tool_calls: z.array(OllamaToolCallSchema).optional(),
});

// Schema for chat completion response (extended for tools)
export const ChatResponseSchema = z.object({
  message: ChatMessageSchema.optional(),
  prompt_eval_count: z.number().optional(),
  eval_count: z.number().optional(),
});

// Schema for chat streaming response chunks (extended for tools)
export const ChatStreamChunkSchema = z.object({
  message: ChatMessageSchema.optional(),
  done: z.boolean().optional(),
  prompt_eval_count: z.number().optional(),
  eval_count: z.number().optional(),
});

// Schema for model object in models list
export const ModelSchema = z.object({
  name: z.string(),
});

// Schema for models list response
export const ModelsResponseSchema = z.object({
  models: z.array(ModelSchema).optional(),
});

// TypeScript interfaces derived from schemas
export type GenerationResponse = z.infer<typeof GenerationResponseSchema>;
export type StreamChunk = z.infer<typeof StreamChunkSchema>;
export type OllamaToolCall = z.infer<typeof OllamaToolCallSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type ChatStreamChunk = z.infer<typeof ChatStreamChunkSchema>;
export type Model = z.infer<typeof ModelSchema>;
export type ModelsResponse = z.infer<typeof ModelsResponseSchema>;
