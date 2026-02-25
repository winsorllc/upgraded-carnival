---
name: content-search
description: Search across multiple backends including local files, GitHub, websites, and vector databases with unified interface
version: 0.1.0
author: PopeBot
tags:
  - search
  - content
  - vector
  - github
  - web
tools:
  - name: content_search_local
    description: Search local files using glob patterns and content matching
    kind: shell
    command: node {{skills_dir}}/content-search/content-search.js search
  - name: content_search_github
    description: Search GitHub repositories using GitHub API
    kind: shell
    command: node {{skills_dir}}/content-search/content-search.js github
  - name: content_search_web
    description: Search the web using search engines
    kind: shell
    command: node {{skills_dir}}/content-search/content-search.js web
  - name: content_index
    description: Index local files for semantic search
    kind: shell
    command: node {{skills_dir}}/content-search/content-search.js index
prompts:
  - Search for files containing "error handling"
  - Search GitHub for recent issues about authentication
  - Index my project for semantic search
  - Find content about machine learning in my codebase
