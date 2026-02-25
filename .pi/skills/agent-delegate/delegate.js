#!/usr/bin/env node

/**
 * Agent Delegate - Spawn specialized sub-agents with context handoff
 * Inspired by ZeroClaw's delegate.rs architecture
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SCRIPT_DIR = __dirname;
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const MAX_DEPTH = 3;
const PARALLEL_LIMIT = 5;

// Parse command line arguments
function parseArgs(args) {
  const result = {
    task: null,
    system: null,
    model: DEFAULT_MODEL,
    files: [],
    context: null,
    parallel: false,
    tasks: {},
    systems: {},
    outputs: {},
    output: null,
    depth: parseInt(process.env.DELEGATE_DEPTH || '0', 10),
    maxDepth: parseInt(process.env.DELEGATE_MAX_DEPTH || MAX_DEPTH.toString(), 10),
    verbose: false,
    synthesize: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--task':
        result.task = next;
        i++;
        break;
      case '--system':
        result.system = next;
        i++;
        break;
      case '--model':
        result.model = next;
        i++;
        break;
      case '--files':
        result.files = next.split(/\s+/);
        i++;
        break;
      case '--context':
        result.context = next;
        i++;
        break;
      case '--parallel':
        result.parallel = true;
        break;
      case '--depth':
        result.depth = parseInt(next, 10);
        i++;
        break;
      case '--max-depth':
        result.maxDepth = parseInt(next, 10);
        i++;
        break;
      case '--output':
        result.output = next;
        i++;
        break;
      case '--verbose':
        result.verbose = true;
        break;
      case '--synthesize':
        result.synthesize = next;
        i++;
        break;
      default:
        // Handle --task-N, --system-N, --output-N for parallel mode
        const taskMatch = arg.match(/^--task-(\d+)$/);
        const systemMatch = arg.match(/^--system-(\d+)$/);
        const outputMatch = arg.match(/^--output-(\d+)$/);

        if (taskMatch) {
          result.tasks[taskMatch[1]] = next;
          i++;
        } else if (systemMatch) {
          result.systems[systemMatch[1]] = next;
          i++;
        } else if (outputMatch) {
          result.outputs[outputMatch[1]] = next;
          i++;
        }
        break;
    }
  }

  return result;
}

// Log if verbose mode
function log(message, verbose = true) {
  if (verbose) {
    console.log(`[Delegate] ${message}`);
  }
}

// Read file content safely
function readFileIfExists(filePath) {
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    if (fs.existsSync(absolutePath)) {
      return fs.readFileSync(absolutePath, 'utf-8');
    }
    return null;
  } catch (err) {
    return null;
  }
}

// Build context package for delegate
function buildContextPackage(options) {
  const context = {
    delegateTask: options.task,
    delegationDepth: options.depth,
    maxDepth: options.maxDepth,
    parentSystem: options.system || null,
    allowFurtherDelegation: options.depth < options.maxDepth - 1
  };

  // Add parent analysis context if provided
  if (options.context) {
    const contextContent = readFileIfExists(options.context);
    if (contextContent) {
      context.parentAnalysis = contextContent;
    }
  }

  // Add file context
  if (options.files && options.files.length > 0) {
    context.relevantFiles = options.files
      .map(file => {
        const content = readFileIfExists(file);
        if (content) {
          return { path: file, content };
        }
        return null;
      })
      .filter(Boolean);
  }

  return context;
}

// Build system prompt for delegate
function buildSystemPrompt(options) {
  const baseSystem = options.system || `You are a specialized assistant with deep expertise in your assigned task.

## Your Role
You have been delegated a specific task by a parent agent. Your job is to:
1. Focus intensely on your assigned task
2. Provide structured, actionable output
3. Stay within your area of expertise
4. Return clear findings that can be merged with other delegates

## Constraints
- You are at delegation depth ${options.depth} of ${options.maxDepth}
- ${options.depth >= options.maxDepth - 1 ? 'You CANNOT delegate further - you are at maximum depth.' : 'You may delegate further if needed, but use discretion.'}
- Return structured JSON output when possible
- Be thorough but concise

## Output Format
Structure your response with:
1. **Summary** - Brief overview of findings
2. **Detailed Analysis** - In-depth examination
3. **Specific Findings** - Itemized list with evidence
4. **Recommendations** - Actionable next steps
5. **Confidence Level** - Your confidence in findings (high/medium/low)`;

  return baseSystem;
}

// Build the prompt for the delegate
function buildDelegatePrompt(contextPackage) {
  let prompt = `## Delegated Task

${contextPackage.delegateTask}

## Context Package

### Delegation Metadata
- **Depth**: ${contextPackage.delegationDepth}/${contextPackage.maxDepth}
- **Further Delegation Allowed**: ${contextPackage.allowFurtherDelegation ? 'Yes' : 'No'}

`;

  // Add parent analysis if available
  if (contextPackage.parentAnalysis) {
    prompt += `### Parent Analysis

Context from the parent agent's work:

${contextPackage.parentAnalysis}

`;
  }

  // Add file context
  if (contextPackage.relevantFiles && contextPackage.relevantFiles.length > 0) {
    prompt += `### Relevant Files

The following files are provided for your analysis:\n\n`;
    
    contextPackage.relevantFiles.forEach((file, idx) => {
      prompt += `--- File ${idx + 1}: ${file.path} ---
\`\`\`
${file.content}
\`\`\`

`;
    });
  }

  prompt += `## Your Instructions

1. Analyze the task using the provided context
2. Return structured output with clear findings
3. If you need more information, note what's missing
4. Be specific and actionable in your recommendations

Proceed with your analysis.`;

  return prompt;
}

// Execute a delegate session using the Task tool or direct API call
async function executeDelegate(contextPackage, options) {
  const systemPrompt = buildSystemPrompt(options);
  const userPrompt = buildDelegatePrompt(contextPackage);

  log(`Executing delegate task: "${options.task}"`, options.verbose);
  log(`Depth: ${options.depth}/${options.maxDepth}`, options.verbose);

  // Try to use the Task tool if available (when running in Pi agent)
  // Otherwise fall back to direct API call
  try {
    // Check if we're running in a Pi agent session (have access to tool APIs)
    if (process.env.PIA_SESSION_ID) {
      // Use Pi's Task tool for delegation
      const result = await executeViaTaskTool(systemPrompt, userPrompt, options);
      return result;
    } else {
      // Fall back to direct API call
      const result = await executeViaDirectAPI(systemPrompt, userPrompt, options);
      return result;
    }
  } catch (err) {
    log(`Delegate execution error: ${err.message}`, options.verbose);
    throw err;
  }
}

// Execute via Pi's Task tool (preferred when available)
async function executeViaTaskTool(systemPrompt, userPrompt, options) {
  // In a real Pi environment, this would use the Task tool
  // For now, we'll simulate with a subprocess call to a Claude API script
  
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'delegate-'));
  const promptFile = path.join(tempDir, 'prompt.md');
  const systemFile = path.join(tempDir, 'system.md');
  const outputFile = path.join(tempDir, 'result.json');

  try {
    fs.writeFileSync(systemFile, systemPrompt);
    fs.writeFileSync(promptFile, userPrompt);

    log('Using Task tool for delegation...', options.verbose);
    
    // For Pi agent, we'd write a task.json file that Pi processes
    // Simulating with a direct API call for now
    const result = await executeViaDirectAPI(systemPrompt, userPrompt, options);
    return result;
  } finally {
    // Cleanup temp files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Execute via direct API call (Claude API)
async function executeViaDirectAPI(systemPrompt, userPrompt, options) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set. Cannot execute delegate.');
  }

  const requestBody = {
    model: options.model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ]
  };

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json();
    const content = result.content?.[0]?.text || '';

    // Try to parse JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        parsed.rawResponse = content;
        return {
          status: 'complete',
          data: parsed,
          rawResponse: content
        };
      } catch (e) {
        // If JSON parsing fails, return raw text
      }
    }

    return {
      status: 'complete',
      data: { summary: content, rawResponse: content },
      rawResponse: content
    };
  } catch (err) {
    throw new Error(`Delegate API call failed: ${err.message}`);
  }
}

// Execute parallel delegates
async function executeParallelDelegates(options) {
  const taskKeys = Object.keys(options.tasks).sort((a, b) => parseInt(a) - parseInt(b));
  
  if (taskKeys.length === 0) {
    throw new Error('No tasks provided for parallel delegation');
  }

  if (taskKeys.length > PARALLEL_LIMIT) {
    log(`Warning: Limiting parallel delegates from ${taskKeys.length} to ${PARALLEL_LIMIT}`, options.verbose);
  }

  const limitedTasks = taskKeys.slice(0, PARALLEL_LIMIT);
  const results = {};

  log(`Spawning ${limitedTasks.length} parallel delegates...`, options.verbose);

  // Execute all delegates in parallel
  const promises = limitedTasks.map(async (key) => {
    const taskOptions = {
      ...options,
      task: options.tasks[key],
      system: options.systems[key] || options.system,
      output: options.outputs[key] || null
    };

    const contextPackage = buildContextPackage(taskOptions);
    
    try {
      const result = await executeDelegate(contextPackage, taskOptions);
      results[key] = {
        taskKey: key,
        task: taskOptions.task,
        success: true,
        result: result.data,
        rawResponse: result.rawResponse
      };

      // Save individual output if specified
      if (taskOptions.output) {
        const outputPath = path.isAbsolute(taskOptions.output) 
          ? taskOptions.output 
          : path.join(process.cwd(), taskOptions.output);
        fs.writeFileSync(outputPath, JSON.stringify(result.data, null, 2));
        log(`Saved output to ${outputPath}`, options.verbose);
      }
    } catch (err) {
      results[key] = {
        taskKey: key,
        task: taskOptions.task,
        success: false,
        error: err.message
      };
    }
  });

  await Promise.all(promises);

  // Run synthesis step if requested
  if (options.synthesize && Object.values(results).every(r => r.success)) {
    log('Running synthesis step...', options.verbose);
    const synthesisContext = {
      ...buildContextPackage(options),
      delegateTask: options.synthesize,
      delegateResults: results
    };

    const synthesisResult = await executeDelegate(synthesisContext, {
      ...options,
      system: `You are a synthesis engine. Your job is to merge and synthesize multiple analysis results into a coherent whole.`
    });

    return {
      status: 'complete',
      parallel: true,
      delegateCount: limitedTasks.length,
      results,
      synthesis: synthesisResult.data,
      rawSynthesis: synthesisResult.rawResponse
    };
  }

  return {
    status: 'complete',
    parallel: true,
    delegateCount: limitedTasks.length,
    results
  };
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  log('Agent Delegate started', options.verbose);
  log(`Depth: ${options.depth}/${options.maxDepth}`, options.verbose);

  // Check depth limit
  if (options.depth >= options.maxDepth) {
    const errorResult = {
      status: 'error',
      error: 'MAX_DEPTH_EXCEEDED',
      message: `Cannot delegate further: maximum depth (${options.maxDepth}) reached`,
      currentDepth: options.depth,
      recommendation: 'Complete this subtask directly without further delegation'
    };

    if (options.output) {
      const outputPath = path.isAbsolute(options.output) 
        ? options.output 
        : path.join(process.cwd(), options.output);
      fs.writeFileSync(outputPath, JSON.stringify(errorResult, null, 2));
      console.log(JSON.stringify(errorResult, null, 2));
    } else {
      console.log(JSON.stringify(errorResult, null, 2));
    }

    process.exit(1);
  }

  try {
    let result;

    if (options.parallel) {
      // Parallel delegation mode
      result = await executeParallelDelegates(options);
    } else {
      // Single delegation mode
      if (!options.task) {
        throw new Error('Missing required argument: --task');
      }

      const contextPackage = buildContextPackage(options);
      result = await executeDelegate(contextPackage, options);

      // Save output if specified
      if (options.output) {
        const outputPath = path.isAbsolute(options.output) 
          ? options.output 
          : path.join(process.cwd(), options.output);
        fs.writeFileSync(outputPath, JSON.stringify(result.data, null, 2));
        log(`Saved output to ${outputPath}`, options.verbose);
      }
    }

    // Output result
    console.log(JSON.stringify(result, null, 2));

    log('Delegation complete', options.verbose);
  } catch (err) {
    const errorResult = {
      status: 'error',
      error: 'DELEGATE_FAILED',
      message: err.message,
      task: options.task,
      retryable: true
    };

    console.log(JSON.stringify(errorResult, null, 2));
    process.exit(1);
  }
}

// Export for use as module
module.exports = {
  parseArgs,
  buildContextPackage,
  buildSystemPrompt,
  buildDelegatePrompt,
  executeDelegate,
  executeParallelDelegates
};

// Run if called directly
if (require.main === module) {
  main();
}
