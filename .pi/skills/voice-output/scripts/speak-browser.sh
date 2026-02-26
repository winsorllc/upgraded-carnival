#!/bin/bash
# Browser TTS using Web Speech API via Chrome DevTools Protocol

TEXT="$1"

if [ -z "$TEXT" ]; then
    echo "Usage: speak-browser.js \"Text to speak\""
    exit 1
fi

# Use Node.js to evaluate JavaScript in Chrome via CDP
node -e "
const CDP = require('chrome-remote-interface');

(async () => {
    let client;
    try {
        client = await CDP();
        const { Runtime } = client;
        
        await Runtime.enable();
        
        // Speak using Web Speech API
        const code = \`
            new Promise((resolve, reject) => {
                const utterance = new SpeechSynthesisUtterance(\`${TEXT.replace(/`/g, '\\`')}\`);
                utterance.onend = () => resolve('spoken');
                utterance.onerror = (e) => reject(e.error);
                speechSynthesis.speak(utterance);
            })
        \`;
        
        const result = await Runtime.evaluate({ expression: code, returnByValue: true });
        console.log('Spoke:', '${TEXT}');
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
        }
    }
})();
"
