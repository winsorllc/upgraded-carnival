#!/usr/bin/env node

/**
 * Local LLM Skill
 * Connect to local LLM servers: Ollama, llama.cpp, vLLM
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Configuration
const config = {
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.2'
  },
  llamacpp: {
    baseUrl: process.env.LLAMA_CPP_BASE_URL || 'http://localhost:8080',
    model: process.env.LLAMA_CPP_MODEL || ''
  },
  vllm: {
    baseUrl: process.env.VLLM_BASE_URL || 'http://localhost:8000',
    model: process.env.VLLM_MODEL || ''
  },
  apiKey: process.env.LOCAL_LLM_API_KEY || ''
};

// HTTP request helper
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
        ...options.headers
      }
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json, text: data });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, text: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

// Ollama provider
const ollama = {
  async chat(message, model = null, stream = false) {
    const url = `${config.ollama.baseUrl}/v1/chat/completions`;
    const response = await request(url, {
      method: 'POST',
      body: {
        model: model || config.ollama.model,
        messages: [{ role: 'user', content: message }],
        stream
      }
    });
    
    if (stream) {
      return response.text;
    }
    
    if (response.data?.choices?.[0]?.message?.content) {
      return response.data.choices[0].message.content;
    }
    throw new Error(`Ollama error: ${JSON.stringify(response.data)}`);
  },

  async streamChat(message, model = null) {
    const url = `${config.ollama.baseUrl}/v1/chat/completions`;
    const response = await request(url, {
      method: 'POST',
      body: {
        model: model || config.ollama.model,
        messages: [{ role: 'user', content: message }],
        stream: true
      }
    });
    return response.text;
  },

  async listModels() {
    const url = `${config.ollama.baseUrl}/api/tags`;
    const response = await request(url);
    return response.data?.models || [];
  }
};

// llama.cpp (llama-server) provider
const llamacpp = {
  async chat(message, model = null, stream = false) {
    const url = `${config.llamacpp.baseUrl}/v1/chat/completions`;
    const modelName = model || config.llamacpp.model || 'default';
    
    const response = await request(url, {
      method: 'POST',
      body: {
        model: modelName,
        messages: [{ role: 'user', content: message }],
        stream
      }
    });
    
    if (stream) {
      return response.text;
    }
    
    if (response.data?.choices?.[0]?.message?.content) {
      return response.data.choices[0].message.content;
    }
    throw new Error(`llama.cpp error: ${JSON.stringify(response.data)}`);
  },

  async listModels() {
    // llama.cpp doesn't have a standard models endpoint
    // Return a placeholder
    return [{ name: config.llamacpp.model || 'loaded-model' }];
  }
};

// vLLM provider
const vllm = {
  async chat(message, model = null, stream = false) {
    const url = `${config.vllm.baseUrl}/v1/chat/completions`;
    const modelName = model || config.vllm.model || 'default';
    
    const response = await request(url, {
      method: 'POST',
      body: {
        model: modelName,
        messages: [{ role: 'user', content: message }],
        stream
      }
    });
    
    if (stream) {
      return response.text;
    }
    
    if (response.data?.choices?.[0]?.message?.content) {
      return response.data.choices[0].message.content;
    }
    throw new Error(`vLLM error: ${JSON.stringify(response.data)}`);
  },

  async listModels() {
    const url = `${config.vllm.baseUrl}/v1/models`;
    const response = await request(url);
    return response.data?.data || [];
  }
};

// Main CLI
async function main() {
  const command = process.argv[2];
  const subcommand = process.argv[3];
  const args = process.argv.slice(4);

  try {
    switch (command) {
      case 'ollama': {
        switch (subcommand) {
          case 'chat': {
            const message = args.join(' ');
            const result = await ollama.chat(message);
            console.log(result);
            break;
          }
          case 'stream': {
            const message = args.join(' ');
            const result = await ollama.streamChat(message);
            console.log(result);
            break;
          }
          case 'models': {
            const models = await ollama.listModels();
            console.log(JSON.stringify(models, null, 2));
            break;
          }
          default:
            console.error('Unknown ollama subcommand. Use: chat, stream, or models');
            process.exit(1);
        }
        break;
      }

      case 'llamacpp': {
        switch (subcommand) {
          case 'chat': {
            const message = args.join(' ');
            const result = await llamacpp.chat(message);
            console.log(result);
            break;
          }
          case 'models': {
            const models = await llamacpp.listModels();
            console.log(JSON.stringify(models, null, 2));
            break;
          }
          default:
            console.error('Unknown llamacpp subcommand. Use: chat or models');
            process.exit(1);
        }
        break;
      }

      case 'vllm': {
        switch (subcommand) {
          case 'chat': {
            const message = args.join(' ');
            const result = await vllm.chat(message);
            console.log(result);
            break;
          }
          case 'models': {
            const models = await vllm.listModels();
            console.log(JSON.stringify(models, null, 2));
            break;
          }
          default:
            console.error('Unknown vllm subcommand. Use: chat or models');
            process.exit(1);
        }
        break;
      }

      case 'test': {
        // Test connectivity to all providers
        console.log('Testing local LLM connections...\n');
        
        try {
          const ollamaModels = await ollama.listModels();
          console.log('✓ Ollama:', config.ollama.baseUrl, `- ${ollamaModels.length} models`);
        } catch (e) {
          console.log('✗ Ollama:', config.ollama.baseUrl, `- ${e.message}`);
        }

        try {
          await llamacpp.listModels();
          console.log('✓ llama.cpp:', config.llamacpp.baseUrl);
        } catch (e) {
          console.log('✗ llama.cpp:', config.llamacpp.baseUrl, `- ${e.message}`);
        }

        try {
          const vllmModels = await vllm.listModels();
          console.log('✓ vLLM:', config.vllm.baseUrl, `- ${vllmModels.length} models`);
        } catch (e) {
          console.log('✗ vLLM:', config.vllm.baseUrl, `- ${e.message}`);
        }
        break;
      }

      default:
        console.log(`
Local LLM Skill - CLI

Commands:
  ollama chat <message>        Chat with Ollama
  ollama stream <message>     Stream chat with Ollama
  ollama models               List Ollama models
  
  llamacpp chat <message>     Chat with llama.cpp server
  llamacpp models             List llama.cpp models
  
  vllm chat <message>         Chat with vLLM server
  vllm models                 List vLLM models
  
  test                        Test connectivity to all providers

Environment Variables:
  OLLAMA_BASE_URL             Ollama server URL (default: http://localhost:11434)
  OLLAMA_MODEL                Default Ollama model (default: llama3.2)
  LLAMA_CPP_BASE_URL          llama.cpp server URL (default: http://localhost:8080)
  VLLM_BASE_URL               vLLM server URL (default: http://localhost:8000)
  VLLM_MODEL                  Default vLLM model
  LOCAL_LLM_API_KEY           API key (optional)

Examples:
  local-llm.js ollama chat "Hello, how are you?"
  local-llm.js vllm chat "Write a function in Python"
  local-llm.js test
        `);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
