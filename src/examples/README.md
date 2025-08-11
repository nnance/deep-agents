# Examples

This folder contains practical examples demonstrating how to use the Generative AI SDK with various AI providers. Each example showcases different aspects of the SDK's functionality.

## Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Environment Setup:**
   Create a `.env` file in the project root with your API keys:
   ```env
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ANTHROPIC_BASE_URL=https://api.anthropic.com  # Optional, defaults to official URL
   OLLAMA_BASE_URL=http://localhost:11434        # Optional, defaults to localhost
   ```

## Running Examples

You can run any example using ts-node:

```bash
# Run a specific example
npx ts-node src/examples/[example-name].ts

# Or after building
node dist/examples/[example-name].js
```

## Available Examples

### 1. `anthropic.ts` - Anthropic Provider Basics
**Purpose:** Demonstrates basic usage of the Anthropic provider with Claude models.

**Features:**
- Service availability checking
- Model listing
- Text generation with Claude 3.5 Sonnet
- Streaming responses with Claude 3.5 Haiku
- Error handling and functional programming patterns

**Usage:**
```bash
npx ts-node src/examples/anthropic.ts
```

**Requirements:** Requires `ANTHROPIC_API_KEY` in your `.env` file.

---

### 2. `ollama.ts` - Ollama Provider Basics
**Purpose:** Shows how to use the Ollama provider for local AI model inference.

**Features:**
- Server health checking
- Model listing and validation
- Text generation with local models
- Functional composition patterns
- Error handling for offline scenarios

**Usage:**
```bash
npx ts-node src/examples/ollama.ts
```

**Requirements:** 
- Ollama server running locally (`ollama serve`)
- At least one model pulled (e.g., `ollama pull llama2`)

---

### 3. `chat-completion.ts` - Chat Interface
**Purpose:** Demonstrates the chat completion interface that works with both message arrays and simple prompts.

**Features:**
- Multi-turn conversation handling
- Message history management
- Support for both Anthropic and Ollama providers
- Prompt vs. messages interface comparison
- Performance benchmarking

**Usage:**
```bash
npx ts-node src/examples/chat-completion.ts
```

**Requirements:** Either Anthropic API key or running Ollama server (or both for comparison).

---

### 4. `tool-calls.ts` - Function Calling & Tools
**Purpose:** Advanced example showing how to implement and use function calling with AI models.

**Features:**
- Custom tool definition (calculator, time functions)
- Tool execution loop with `executeToolLoop`
- Direct tool calls without the loop
- Error handling in tool execution
- Support for both Anthropic and Ollama providers

**Tools Included:**
- `calculate`: Evaluates mathematical expressions
- `get_time`: Returns current timestamp

**Usage:**
```bash
npx ts-node src/examples/tool-calls.ts
```

**Requirements:** 
- Anthropic API key (for testAnthropicTools - currently commented out)
- Ollama server with a capable model like `qwen3:30b` for tool calling

---

### 5. `all-providers.ts` - Provider Comparison
**Purpose:** Comprehensive testing and comparison of all supported providers.

**Features:**
- Automated testing of multiple providers
- Response validation and structure checking
- Performance comparison
- Error handling across different provider types
- Functional programming patterns for testing

**Usage:**
```bash
npx ts-node src/examples/all-providers.ts
```

**Requirements:** Set up any providers you want to test (Anthropic API key and/or Ollama server).

## Common Issues & Troubleshooting

### Anthropic Provider
- **"API key not found"**: Ensure `ANTHROPIC_API_KEY` is set in your `.env` file
- **Rate limiting**: Claude models have rate limits; wait between requests if you hit limits

### Ollama Provider
- **"Connection refused"**: Make sure Ollama is running with `ollama serve`
- **"No models available"**: Pull a model first with `ollama pull [model-name]`
- **Tool calling**: Not all Ollama models support function calling; use models like `qwen3:30b` or `mistral` variants

### General
- **TypeScript errors**: Ensure you've run `npm run build` after making changes
- **Module not found**: Make sure you're running from the project root directory
- **Performance**: Local Ollama models may be slower than cloud APIs depending on your hardware

## Model Recommendations

### Anthropic (Cloud)
- **Fast responses**: `claude-3-5-haiku-20241022`
- **High quality**: `claude-3-5-sonnet-20241022`
- **Tool calling**: All Claude 3.5 models support function calling

### Ollama (Local)
- **General use**: `llama3.1:8b`, `llama3.1:70b`
- **Tool calling**: `qwen3:30b`, `mistral:7b-instruct`
- **Fast responses**: `phi3:mini`, `gemma2:2b`

## Next Steps

After running these examples, you can:
1. Explore the SDK source code in `src/sdk/`
2. Check out the provider-specific documentation in `src/sdk/providers/`
3. Build your own applications using the patterns shown here
4. Contribute additional examples or improvements

## Contributing

Feel free to add new examples or improve existing ones. Make sure to:
- Include proper error handling
- Add comments explaining complex logic
- Update this README when adding new examples
- Test with both providers when applicable
