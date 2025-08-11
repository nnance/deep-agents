import { z } from 'zod';

// Schema for usage information in API responses
export const UsageSchema = z.object({
  input_tokens: z.number().optional(),
  output_tokens: z.number().optional(),
});

// Schema for content block in non-streaming responses
export const ContentBlockSchema = z.union([
  z.object({
    type: z.literal('text'),
    text: z.string(),
  }),
  z.object({
    type: z.literal('tool_use'),
    id: z.string(),
    name: z.string(),
    input: z.record(z.string(), z.any()),
  }),
]);

// Schema for non-streaming message response
export const MessageResponseSchema = z.object({
  content: z.array(ContentBlockSchema).optional(),
  usage: UsageSchema.optional(),
});

// Schema for streaming delta content
export const StreamDeltaSchema = z.object({
  text: z.string().optional(),
});

// Schema for streaming response chunks
export const StreamChunkSchema = z.object({
  type: z.string(),
  delta: StreamDeltaSchema.optional(),
  usage: UsageSchema.optional(),
});

// Schema for model object in models list
export const ModelSchema = z.object({
  id: z.string(),
});

// Schema for models list response
export const ModelsResponseSchema = z.object({
  data: z.array(ModelSchema).optional(),
});

// TypeScript interfaces derived from schemas
export type Usage = z.infer<typeof UsageSchema>;
export type ContentBlock = z.infer<typeof ContentBlockSchema>;
export type MessageResponse = z.infer<typeof MessageResponseSchema>;
export type StreamDelta = z.infer<typeof StreamDeltaSchema>;
export type StreamChunk = z.infer<typeof StreamChunkSchema>;
export type Model = z.infer<typeof ModelSchema>;
export type ModelsResponse = z.infer<typeof ModelsResponseSchema>;
