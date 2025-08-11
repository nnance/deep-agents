import type { ChatCompletionOptions, Message } from "./messages.js";

// Tool interface for defining available tools to the LLM
export interface Tool {
	name: string; // The name of the tool
	description: string; // A brief description of the tool
	parameters: {
		type: "object";
		properties: Record<string, unknown>;
		required?: string[];
	};
}

// Tool call interface for tracking tool usage in chat messages
export interface ToolCall {
	id: string;
	name: string;
	arguments: Record<string, unknown>;
}

// Tool response interface for returning results from tool calls
export interface ToolResponse {
	id: string;
	name: string;
	result: unknown;
}

// Message interface for chat messages with tool usage
export interface MessageWithTool extends Omit<Message, "role"> {
	role: "system" | "user" | "assistant" | "tool";
    toolName?: string;
	toolCallId?: string; // For tool response messages
	toolCalls?: ToolCall[]; // For assistant messages requesting tool use
}

// Chat options interface for enabling tool usage
export interface ChatWithToolsOptions
	extends Omit<ChatCompletionOptions, "messages"> {
	messages?: MessageWithTool[]; // Use messages for chat mode (overrides prompt)
	tools?: Tool[]; // Available tools for the model to use
	maxToolCalls?: number; // Maximum number of tool calls allowed (default: 10)
}

// Chat response interface for chat messages with tool usage
export interface ChatWithToolsResponse {
	toolCalls?: ToolCall[]; // Tool calls requested by the model
	toolCallCount?: number; // Number of tool calls made
	maxToolCallsReached?: boolean; // Indicates if limit was reached
}

// LLM provider interface for chat with tools
export interface LLMProviderWithTools {
	generateChatWithTools(
		options: ChatWithToolsOptions,
	): Promise<ChatWithToolsResponse>;
}

// Tool loop options interface for managing tool calls.  It should be implemented
// by the application to handle tool calls in a loop.
export interface ToolLoopOptions {
	onToolCall?: (toolCall: ToolCall) => Promise<ToolResponse>;
}

// Tool loop result interface for managing tool call results.
export interface ToolLoopResult {
	finalResponse: ChatWithToolsResponse;
	toolCallCount: number;
	maxToolCallsReached: boolean;
	messages: Message[];
}

// Tool loop function for executing tool calls in a loop.
export type executeToolLoop = (
	provider: LLMProviderWithTools,
	options: ToolLoopOptions,
) => Promise<ToolLoopResult>