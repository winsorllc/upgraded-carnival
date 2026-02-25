---
name: github-code-search
description: Search for code patterns, functions, and implementations across GitHub repositories using GitHub's code search API. Use when: (1) finding usage examples of an API or function, (2) searching for specific code patterns across a repo, (3) discovering implementations of a pattern, (4) exploring codebase architecture.
---

# GitHub Code Search

Search for code patterns, functions, and implementations across GitHub repositories using GitHub's advanced code search capabilities.

## Setup

No additional setup required. Uses the `gh` CLI which should already be authenticated.

Verify authentication:
```bash
gh auth status
```

## When to Use

✅ **USE this skill when:**

- Finding usage examples of an API or function
- Searching for specific code patterns, classes, or functions
- Discovering implementations of a specific pattern across repos
- Exploring how a library or API is used in the wild
- Finding code matching specific keywords or regex patterns
- Searching within a specific repository or across GitHub

❌ **DON'T use this skill when:**

- You need to search private repos you don't have access to
- You need real-time search (GitHub code search has some delay)
- You need to search very large codebases (rate limits apply)

## Code Search Syntax

GitHub code search supports powerful search syntax:

### Basic Searches
```bash
# Search for a specific term
{baseDir}/search.sh "function name"

# Search in a specific language
{baseDir}/search.sh "async await" language:javascript

# Search in a specific repo
{baseDir}/search.sh "TODO" repo:owner/repo
```

### Advanced Search Operators
```bash
# Search for function definitions
{baseDir}/search.sh "def function_name" 

# Search for class definitions
{baseDir}/search.sh "class MyClass"

# Search with file extension filter
{baseDir}/search.sh "api" extension:py

# Search in path
{baseDir}/search.sh "config" path:src/

# Search for exact match
{baseDir}/search.sh '"exact phrase"'

# Search for org members
{baseDir}/search.sh "api" org:github

# Combine multiple filters
{baseDir}/search.sh "await fetch" language:typescript repo:owner/repo
```

### Search Scope
- `in:file` - Search in file contents (default)
- `in:path` - Search in file paths
- `in:path,file` - Search both (default)

## Usage

### Basic Code Search
```bash
{baseDir}/search.sh "console.log"
```

### Search with Language Filter
```bash
{baseDir}/search.sh "useState" language:javascript
{baseDir}/search.sh "def main" language:python
{baseDir}/search.sh "interface Props" language:typescript
```

### Search in Specific Repository
```bash
{baseDir}/search.sh "TODO" repo:facebook/react
{baseDir}/search.sh "async function" repo:nodejs/node
```

### Search for Function/Class Definitions
```bash
{baseDir}/search.sh "function handleSubmit"
{baseDir}/search.sh "class DataService"
{baseDir}/search.sh "const useQuery"
```

### Search for API Usage Examples
```bash
# Find fetch API usage
{baseDir}/search.sh "fetch(" language:javascript

# Find axios usage
{baseDir}/search.sh "axios.get" language:javascript

# Find React hooks usage
{baseDir}/search.sh "useEffect" language:javascript
```

## Output Format

The search results include:
- **Filename**: Path to the file
- **Repository**: Owner/repo name
- **Matches**: Number of matches in the file
- **Preview**: Code snippet around the match

Example output:
```
=== Search Results ===
Query: useState language:javascript
Total results: 42

--- Result 1/10 ---
Repo: facebook/react
File: packages/react/src/ReactHooks.js
Matches: 5
Preview:
  62 | export function useState(initialState) {
  63 |   const dispatcher = resolveDispatcher();
  64 |   return dispatcher.useState(initialState);
  65 | }
...
```

## Tips

1. **Be specific**: More specific queries return better results
2. **Use language filters**: Narrow down to relevant languages
3. **Check multiple pages**: Use `--page` for pagination
4. **Combine with browser-tools**: For interactive exploration after finding interesting code

## Rate Limits

- GitHub code search has rate limits based on your authentication level
- Unauthenticated: 10 requests/minute
- Authenticated (gh CLI): 30 requests/minute
- GitHub Pro: 20 requests/minute (more for code search)

## Examples in Context

### Finding React Patterns
```bash
{baseDir}/search.sh "useEffect(() => {" language:javascript -n 10
```

### Finding Python Best Practices
```bash
{baseDir}/search.sh "async def" language:python -n 10
```

### Finding Configuration Examples
```bash
{baseDir}/search.sh "webpack.config" extension:js
```

### Finding Test Patterns
```bash
{baseDir}/search.sh "describe(" language:javascript
{baseDir}/search.sh "def test_" language:python
```
