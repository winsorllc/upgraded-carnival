// Test all 4 Ollama Cloud models: identity check + 500-word essay
const API_KEY = process.env.OLLAMA_API_KEY;
if (!API_KEY) { console.error("Set OLLAMA_API_KEY env var first"); process.exit(1); }
const BASE_URL = "https://ollama.com/v1";
const fs = await import('fs');

const MODELS = [
    { name: "Jackie", model: "glm-5" },
    { name: "Mimi", model: "minimax-m2.5" },
    { name: "Kate", model: "kimi-k2.5" },
    { name: "Gwen", model: "qwen3.5:397b" },
];

const PROMPTS = [
    { label: "Identity Check", content: "Say hello and tell me your model name. Who created you? Answer in 2-3 sentences." },
    { label: "500-Word Essay", content: "Write a 500-word essay on the future of artificial intelligence. Be specific, cite real trends, and make it compelling." },
];

async function callModel(model, prompt, maxTokens = 1000) {
    const start = Date.now();
    try {
        const response = await fetch(`${BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: prompt }],
                max_tokens: maxTokens,
            }),
        });

        const elapsed = ((Date.now() - start) / 1000).toFixed(1);

        if (!response.ok) {
            const errorText = await response.text();
            return { success: false, error: `HTTP ${response.status}: ${errorText}`, elapsed };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "No content";
        const usage = data.usage || {};
        const wordCount = content.split(/\s+/).length;

        return { success: true, content, usage, wordCount, elapsed };
    } catch (err) {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        return { success: false, error: err.message, elapsed };
    }
}

// Run all tests
let output = `# Ollama Cloud Model Test Results\n`;
output += `**Date:** ${new Date().toISOString()}\n`;
output += `**API:** ${BASE_URL}\n\n`;

for (const prompt of PROMPTS) {
    output += `---\n\n## Test: ${prompt.label}\n\n`;
    output += `**Prompt:** "${prompt.content}"\n\n`;

    for (const m of MODELS) {
        console.log(`Testing ${m.name} (${m.model}) — ${prompt.label}...`);
        const maxTokens = prompt.label === "500-Word Essay" ? 1500 : 300;
        const result = await callModel(m.model, prompt.content, maxTokens);

        output += `### ${m.name} (${m.model})\n\n`;
        output += `- **Time:** ${result.elapsed}s\n`;

        if (result.success) {
            output += `- **Word Count:** ${result.wordCount}\n`;
            output += `- **Tokens:** prompt=${result.usage.prompt_tokens || "?"}, completion=${result.usage.completion_tokens || "?"}, total=${result.usage.total_tokens || "?"}\n\n`;
            output += `**Response:**\n\n${result.content}\n\n`;
        } else {
            output += `- **ERROR:** ${result.error}\n\n`;
        }
    }
}

// Save results
fs.writeFileSync("d:\\dev_aiwinsor\\popebot_agent\\MODEL_TEST_RESULTS.md", output);
console.log("\n✅ Results saved to MODEL_TEST_RESULTS.md");
