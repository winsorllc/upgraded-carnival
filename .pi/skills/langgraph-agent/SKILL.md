---
name: langgraph-agent
description: LangGraph-based agent framework for consistent tool calling with automatic tool loops. Use when you need reliable multi-step task execution with OpenAI-compatible providers (Z.AI/GLM-5, OpenRouter, Groq, DeepSeek, Ollama).
---

# LangGraph Agent Skill

This skill provides a LangGraph-based agent framework for consistent tool calling across all OpenAI-compatible LLM providers.

## When to Use

- You need guaranteed tool calling consistency (especially with GLM-5, Zhipu, or other models with inconsistent tool invocation)
- You want automatic tool loops that keep calling tools until the task is complete
- You're working with multiple LLM providers and need a unified interface
- You need to build custom agents with specific tool sets

## Capabilities

- **create_agent**: Create a LangGraph agent with custom tools
- **run_agent**: Execute a task with the agent
- **add_tool**: Add a custom tool to an agent
- **get_agent_result**: Retrieve the final result from agent execution

## Environment Variables

Required for the agent to function:
- `LLM_API_KEY`: Your LLM provider API key
- `LLM_BASE_URL` (optional): Custom base URL for OpenAI-compatible providers (default: OpenAI)
- `LLM_MODEL` (optional): Model name (default: "gpt-4o")

## Provider Examples

```
# Z.AI / GLM-5
LLM_BASE_URL=https://api.z.ai/api/coding/paas/v4
LLM_MODEL=glm-5

# OpenRouter
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=meta-llama/llama-3-70b-instruct

# Groq
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama3-70b-8192

# Ollama (local)
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3

# DeepSeek
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
```

## Usage Pattern

1. Create an agent with the tools you need
2. Run the agent with a task prompt
3. The agent automatically loops through tool calls until completion
4. Retrieve the final result
