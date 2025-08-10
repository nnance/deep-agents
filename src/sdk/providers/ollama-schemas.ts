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
export type Model = z.infer<typeof ModelSchema>;
export type ModelsResponse = z.infer<typeof ModelsResponseSchema>;
