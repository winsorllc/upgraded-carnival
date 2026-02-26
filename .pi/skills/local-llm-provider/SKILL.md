---
name: local-llm-provider
description: "Connect to local LLM endpoints (Ollama, llama.cpp, vLLM) with automatic provider fallback. Use when: (1) you need to run LLM inference locally for privacy/cost, (2) you want to use models not available via cloud APIs, (3) you need offline capability, (4) you want automatic fallback to cloud providers when local fails."
---

# Local LLM Provider

Connect to local LLM endpoints (Ollama, llama.cpp, vLLM) with automatic fallback to cloud providers. This skill enables the agent to leverage local GPU/CPU inference while maintaining reliability through intelligent fallback.

## When to Use

- Running LLM inference locally for privacy (data never leaves your machine)
- Using models not available via cloud APIs (e.g., fine-tuned models, Llama variants)
- Reducing API costs for high-volume tasks
- Working offline or with intermittent connectivity
- Need low-latency responses for interactive tasks

## Setup

No additional setup required if Ollama is already running. Otherwise:

### Ollama Setup

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3.2

# Start the server (default: http://localhost:11434)
ollama serve
```

### llama.cpp Server Setup

```bash
# Build llama-server
make llama-server

# Start the server
llama-server -hf ggml-org/gpt-oss-20b-GGUF -c 133000 --host 127.0.0.1 --port 8080
```

### vLLM Server Setup

```bash
# Install vLLM
pip install vllm

# Start the server
vllm serve meta-llama/Llama-3.1-8B-Instruct
```

## Usage

### Query a local model

```bash
node /job/.pi/skills/local-llm-provider/query.js "What is 2+2?" --model llama3.2
```

### Query with custom parameters

```bash
node /job/.pi/skills/local-llm-provider/query.js "Explain quantum computing" --model mixtral --temp 0.8 --max-tokens 500
```

### List available models

```bash
node /job/.pi/skills/local-llm-provider/list-models.js
```

### Check server health

```bash
node /job/.pi/skills/local-llm-provider/health.js
```

### Stream responses

```bash
node /job/.pi/skills/local-llm-provider/query.js "Tell me a story" --stream
```

## Configuration

Create a `config.json` in the skill directory for persistent settings:

```json
{
  "providers": [
    {
      "name": "ollama",
      "url": "http://localhost:11434",
      "enabled": true,
      "fallback_order": 1
    },
    {
      "name": "llamacpp",
      "url": "http://localhost:8080/v1",
      "enabled": false,
      "fallback_order": 2
    },
    {
      "name": "vllm",
      "url": "http://localhost:8000/v1",
      "enabled": false,
      "fallback_order": 3
    }
  ],
  "default_model": "llama3.2",
  "fallback_to_cloud": true,
  "cloud_provider": "anthropic",
  "timeout_ms": 120000
}
```

## Provider Fallback

The skill implements intelligent fallback:

1. **Primary**: Try local Ollama first
2. **Secondary**: Try llama.cpp server
3. **Tertiary**: Try vLLM server
4. **Fallback**: Use cloud provider (if enabled)

Each provider failure triggers automatic retry with the next available provider.

## Supported Models

### Ollama
- llama3.2, llama3.1, llama3
- mistral, mixtral
- qwen2.5, qwen2
- phi3, phi4
- gemma2, gemma
- codellama
- and many more

### llama.cpp
- Any GGUF format model
- Mistral variants
- Llama variants
- Qwen variants

### vLLM
- Llama 3.1, 3.0
- Mistral
- Qwen
- Any HuggingFace model

## API Integration

### As a library

```javascript
const { LocalLLMProvider } = require('./provider.js');

const provider = new LocalLLMProvider({
  providers: [
    { name: 'ollama', url: 'http://localhost:11434', enabled: true },
    { name: 'anthropic', api_key: process.env.ANTHROPIC_API_KEY, enabled: false }
  ],
  default_model: 'llama3.2',
  fallback_to_cloud: true
});

const response = await provider.complete('Hello, how are you?');
console.log(response);
```

## Output Format

The query returns JSON:

```json
{
  "success": true,
  "provider": "ollama",
  "model": "llama3.2",
  "response": "I'm doing well, thank you for asking!",
  "tokens": 42,
  "duration_ms": 1500,
  "done": true
}
```

When streaming:

```json
{
  "success": true,
  "provider": "ollama",
  "model": "llama3.2",
  "response": "I",
  "tokens": 1,
  "done": false
}
```

On fallback failure:

```json
{
  "success": false,
  "error": "All providers failed",
  "providers_tried": ["ollama", "llamacpp"],
  "last_error": "Connection refused"
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OLLAMA_BASE_URL` | Ollama server URL | http://localhost:11434 |
| `LLAMACPP_BASE_URL` | llama.cpp server URL | http://localhost:8080/v1 |
| `VLLM_BASE_URL` | vLLM server URL | http://localhost:8000/v1 |
| `LOCAL_LLM_DEFAULT_MODEL` | Default model to use | llama3.2 |

## Limitations

- Requires local server to be running
- Model quality depends on local hardware
- Not all models support all features (e.g., function calling)
- Some providers have different API formats

## Tips

1. **For best performance**: Use Ollama with GPU acceleration
2. **For variety**: Pull multiple models (`ollama pull mixtral`)
3. **For privacy**: Always use local providers first
4. **For reliability**: Keep cloud fallback enabled for critical tasks
5. **For speed**: Use smaller models (7B) for simple tasks, larger (70B) for complex reasoning
