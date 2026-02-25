---
name: model-routing
description: Intelligently route tasks to optimal LLM providers based on task complexity, cost, speed, and capability requirements
version: 0.1.0
author: PopeBot
tags:
  - llm
  - routing
  - model-selection
  - cost-optimization
tools:
  - name: model_route
    description: Route a task to the optimal LLM based on complexity, cost, and capability requirements
    kind: shell
    command: node {{skills_dir}}/model-routing/model-router.js route
  - name: model_compare
    description: Compare models by capability, cost, speed, and context length
    kind: shell
    command: node {{skills_dir}}/model-routing/model-router.js compare
  - name: model_config
    description: Configure model providers, API keys, and routing rules
    kind: shell
    command: node {{skills_dir}}/model-routing/model-router.js config
prompts:
  - Route this task to the cheapest model that can handle it
  - Compare the available models for code generation
  - Configure model routing to prefer faster models for simple tasks
