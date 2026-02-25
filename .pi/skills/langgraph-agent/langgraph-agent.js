/**
 * LangGraph Agent Skill
 * 
 * Provides LangGraph-based agent framework for consistent tool calling
 * across all OpenAI-compatible LLM providers.
 */

const { OpenAI } = require('openai');

/**
 * Create a LangGraph-style agent state
 */
class AgentState {
  constructor() {
    this.messages = [];
    this.toolCalls = [];
    this.toolResults = [];
  }

  addMessage(role, content) {
    this.messages.push({ role, content });
    return this;
  }

  addToolCall(name, args, callId) {
    this.toolCalls.push({ name, args, callId });
    this.messages.push({
      role: 'assistant',
      content: null,
      tool_calls: [{ id: callId, type: 'function', function: { name, arguments: JSON.stringify(args) } }]
    });
    return this;
  }

  addToolResult(callId, result) {
    this.toolResults.push({ callId, result });
    this.messages.push({ role: 'tool', tool_call_id: callId, content: result });
    return this;
  }

  getLastMessage() {
    return this.messages[this.messages.length - 1];
  }
}

/**
 * Default tools available to all agents
 */
const defaultTools = {
  shell: {
    name: 'shell',
    description: 'Execute a shell command and return the output',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute' }
      },
      required: ['command']
    },
    execute: async (args) => {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      try {
        const { stdout, stderr } = await execAsync(args.command, { timeout: 30000 });
        return stdout || stderr || 'Command executed successfully';
      } catch (error) {
        return `Error: ${error.message}`;
      }
    }
  },
  
  file_read: {
    name: 'file_read',
    description: 'Read the contents of a file',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to read' }
      },
      required: ['path']
    },
    execute: async (args) => {
      const fs = require('fs').promises;
      try {
        const content = await fs.readFile(args.path, 'utf-8');
        return content.slice(0, 10000); // Limit to 10KB
      } catch (error) {
        return `Error reading file: ${error.message}`;
      }
    }
  },
  
  file_write: {
    name: 'file_write',
    description: 'Write content to a file',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to write' },
        content: { type: 'string', description: 'Content to write to the file' }
      },
      required: ['path', 'content']
    },
    execute: async (args) => {
      const fs = require('fs').promises;
      const path = require('path');
      try {
        await fs.mkdir(path.dirname(args.path), { recursive: true });
        await fs.writeFile(args.path, args.content, 'utf-8');
        return `Successfully wrote to ${args.path}`;
      } catch (error) {
        return `Error writing file: ${error.message}`;
      }
    }
  }
};

/**
 * Create a LangGraph-style agent
 * @param {Object} options - Agent configuration
 * @param {Array} options.tools - Array of tool definitions
 * @param {string} options.model - Model name
 * @param {string} options.apiKey - API key
 * @param {string} options.baseURL - Base URL for API
 * @returns {Object} Agent instance with invoke method
 */
async function createAgent(options = {}) {
  const {
    tools = [],
    model = 'gpt-4o',
    apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY,
    baseURL = process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL
  } = options;

  if (!apiKey) {
    throw new Error('API key required. Set LLM_API_KEY or OPENAI_API_KEY environment variable.');
  }

  const client = new OpenAI({ apiKey, baseURL });
  const state = new AgentState();
  
  // Combine default tools with custom tools
  const allTools = { ...defaultTools };
  for (const tool of tools) {
    allTools[tool.name] = tool;
  }

  // Convert tools to OpenAI function format
  const functions = Object.values(allTools).map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  }));

  /**
   * Run the agent with a task
   * @param {string} task - The task to execute
   * @param {number} maxIterations - Maximum tool call iterations (default: 20)
   * @returns {Object} Agent result with messages and final output
   */
  async function invoke(task, maxIterations = 20) {
    state.addMessage('user', task);
    
    let iterations = 0;
    let continueLoop = true;

    while (continueLoop && iterations < maxIterations) {
      iterations++;
      
      // Call LLM
      const response = await client.chat.completions.create({
        model,
        messages: state.messages,
        functions,
        function_call: 'auto'
      });

      const message = response.choices[0].message;
      
      // Check if there's a function call
      if (message.function_call) {
        const { name, arguments: argsStr } = message.function_call;
        const args = JSON.parse(argsStr);
        
        state.addMessage('assistant', null);
        state.messages[state.messages.length - 1].function_call = message.function_call;

        // Execute the tool
        if (allTools[name]) {
          const result = await allTools[name].execute(args);
          state.addMessage('function', result);
          state.messages[state.messages.length - 1].name = name;
        } else {
          state.addMessage('function', `Error: Tool "${name}" not found`);
          state.messages[state.messages.length - 1].name = name;
        }
      } else {
        // No function call, we have the final answer
        state.addMessage('assistant', message.content);
        continueLoop = false;
      }
    }

    if (iterations >= maxIterations) {
      state.addMessage('assistant', '[Agent stopped: Maximum iterations reached]');
    }

    return {
      messages: state.messages,
      output: state.getLastMessage().content,
      iterations
    };
  }

  return { invoke, state, tools: allTools };
}

/**
 * Create a custom tool definition
 * @param {string} name - Tool name
 * @param {string} description - Tool description
 * @param {Object} parameters - JSON Schema parameters
 * @param {Function} execute - Async function to execute the tool
 * @returns {Object} Tool definition
 */
function createTool(name, description, parameters, execute) {
  return { name, description, parameters, execute };
}

module.exports = {
  createAgent,
  createTool,
  AgentState
};
