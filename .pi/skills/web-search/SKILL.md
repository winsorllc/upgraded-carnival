# Web Search (SerpAPI)

Use this skill when you need to search the web for information. SerpAPI provides Google search results as structured JSON.

## Usage

When you need to search the web, run this Python script with your query:

```python
import urllib.request
import urllib.parse
import json
import os

def search(query, num_results=5):
    """Search the web using SerpAPI (Google)."""
    api_key = os.environ.get("SERPAPI_KEY", "")
    if not api_key:
        return {"error": "SERPAPI_KEY not set in environment"}
    
    params = urllib.parse.urlencode({
        "q": query,
        "api_key": api_key,
        "engine": "google",
        "num": num_results
    })
    
    url = f"https://serpapi.com/search.json?{params}"
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
        
        results = []
        for item in data.get("organic_results", [])[:num_results]:
            results.append({
                "title": item.get("title", ""),
                "link": item.get("link", ""),
                "snippet": item.get("snippet", "")
            })
        
        return {"query": query, "results": results}
    except Exception as e:
        return {"error": str(e)}

# Example: search("Alberta Rule 13.18 case law")
```

## When to Use

- Research tasks (legal case law, technical documentation, etc.)
- Fact-checking and verification
- Finding current information
- When browsing with headless Chrome would be too slow

## Fallback

If SerpAPI is unavailable or quota exceeded, fall back to using the headless Chrome browser to search Google directly.

## Environment Variable

The API key is available as `SERPAPI_KEY` in your environment (set via `AGENT_LLM_SERPAPI_KEY` GitHub secret).
