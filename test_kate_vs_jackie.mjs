// Head-to-Head: Can Kate (kimi-k2.5) beat Jackie's (glm-5) skills?
// We give Kate Jackie's SKILL.md and ask her to write a BETTER version
const fs = await import('fs');

const API_KEY = "5c308e8a1a294775993d466d6a6bcad2.9whN6hD3vkHJBYh-K-sujIDM";
const BASE_URL = "https://ollama.com/v1";

const jackieSystemInfo = fs.readFileSync("d:\\dev_aiwinsor\\popebot_agent\\.pi\\skills\\system-info\\SKILL.md", "utf-8");
const jackieTimestamp = fs.readFileSync("d:\\dev_aiwinsor\\popebot_agent\\.pi\\skills\\timestamp\\SKILL.md", "utf-8");

const CHALLENGE_PROMPT = (skillName, skillContent) => `You are an expert developer. Below is a PopeBot SKILL.md file written by another AI agent named "Jackie" (GLM-5). Your job is to write a BETTER version of this same skill.

Rules:
1. Keep the same YAML frontmatter format (---name/description---)
2. You must ADD features Jackie missed
3. You must IMPROVE the documentation quality
4. You must include MORE edge cases and examples
5. Do NOT just copy — you must genuinely improve it

Here is Jackie's version of the "${skillName}" skill:

\`\`\`
${skillContent}
\`\`\`

Now write YOUR improved version of this SKILL.md. Output ONLY the markdown file content, nothing else.`;

async function callModel(model, prompt) {
    const start = Date.now();
    try {
        const response = await fetch(`${BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                model,
                messages: [{ role: "user", content: prompt }],
                max_tokens: 3000,
            }),
        });
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}`, elapsed };
        }
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";
        const wordCount = content.split(/\s+/).length;
        return { success: true, content, wordCount, elapsed };
    } catch (err) {
        return { success: false, error: err.message, elapsed: "?" };
    }
}

let output = `# Head-to-Head: Kate vs Jackie's Skills\n`;
output += `**Date:** ${new Date().toISOString()}\n`;
output += `**Challenge:** Can Kate (kimi-k2.5) genuinely IMPROVE Jackie's (glm-5) skills?\n\n`;

const skills = [
    { name: "system-info", content: jackieSystemInfo },
    { name: "timestamp", content: jackieTimestamp },
];

for (const skill of skills) {
    output += `---\n\n## Skill: ${skill.name}\n\n`;
    output += `### Jackie's Original (${skill.content.split(/\s+/).length} words)\n\n`;
    output += `\`\`\`markdown\n${skill.content}\n\`\`\`\n\n`;

    console.log(`Challenging Kate to beat Jackie's "${skill.name}"...`);
    const result = await callModel("kimi-k2.5", CHALLENGE_PROMPT(skill.name, skill.content));

    output += `### Kate's Improved Version (${result.wordCount} words, ${result.elapsed}s)\n\n`;
    if (result.success) {
        output += `${result.content}\n\n`;
    } else {
        output += `**ERROR:** ${result.error}\n\n`;
    }
}

fs.writeFileSync("d:\\dev_aiwinsor\\popebot_agent\\KATE_VS_JACKIE.md", output);
console.log("\n✅ Results saved to KATE_VS_JACKIE.md");
