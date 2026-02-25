---
name: local-llm
description: Connect to local LLM servers including Ollama, llama.cpp (llama-server), and vLLM for offline inference.
---

# Local LLM Skill

Connect to local Large Language Model servers for offline inference. Supports Ollama, llama.cpp (llama-server), and vLLM server endpoints. Inspired by ZeroClaw's provider architecture.

## Setup

1. Install and run your preferred local LLM server:
   - **Ollama**: `ollama serve` (default port 11434)
   - **llama.cpp**: `llama-server -hf <model> --port 8080`
   - **vLLM**: `vllm serve <model> --port 8000`

2. Configure your environment:
   ```bash
   export OLLAMA_BASE_URL=http://localhost:11434
   export LLAMA_CPP_BASE_URL=http://localhost:8080
   export VLLM_BASE_URL=http://localhost:8000
   ```

## Usage

### Chat with Ollama

```bash
{baseDir}/local-llm.js ollama chat "What is TypeScript?"
```

### Chat with llama.cpp

```bash
{baseDir}/local-llm.js llamacpp chat "Explain quantum computing"
```

### Chat with vLLM

```bash
{baseDir}/local-llm.js vllm chat "Write a hello world in Rust"
```

### List available models

```bash
{baseDir}/local-llm.js ollama models
{baseDir}/local-llm.js llamacpp models
{baseDir}/local-llm.js vllm models
```

### Streaming chat

```bash
{baseDir}/local-llm.js ollama stream "Tell me a story"
```

## Configuration

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `OLLAMA_BASE_URL` | Ollama server URL | http://localhost:11434 |
| `OLLAMA_MODEL` | Default Ollama model | llama3.2 |
| `LLAMA_CPP_BASE_URL` | llama.cpp server URL | http://localhost:8080 |
| `LLAMA_CPP_MODEL` | Default llama.cpp model | (from server) |
| `VLLM_BASE_URL` | vLLM server URL | http://localhost:8000 |
| `VLLM_MODEL` | Default vLLM model | (from server) |
| `LOCAL_LLM_API_KEY` | API key (optional) | none |

## Supported Providers

| Provider | Protocol | Default Port | Features |
|----------|----------|--------------|----------|
| Ollama | OpenAI-compatible | 11434 | Streaming, chat, models |
| llama.cpp | OpenAI-compatible | 8080 | Streaming, chat, models |
| vLLM | OpenAI-compatible | 8000 | Streaming, chat, models, tool calling |

## Example Use Cases

- **Offline inference**: Run LLMs without internet
- **Privacy-sensitive tasks**: Keep data local
- **Development**: Test prompts without API costs
- **Custom models**: Run fine-tuned models locally
