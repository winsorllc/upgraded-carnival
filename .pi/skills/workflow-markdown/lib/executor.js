/**
 * Workflow Executor
 * 
 * Executes parsed workflow steps, handling different step types and variable substitution.
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { substituteVariables } from './parser.js';

const execAsync = promisify(exec);

/**
 * Workflow execution result
 * @typedef {Object} ExecutionResult
 * @property {boolean} success - Whether workflow completed successfully
 * @property {number} exitCode - Overall exit code
 * @property {Array} stepResults - Results from each step
 * @property {number} duration - Total execution time in ms
 * @property {string} summary - Human-readable summary
 */

/**
 * Execute a workflow
 * @param {Object} workflow - Parsed workflow object from parser
 * @param {Object} options - Execution options
 * @param {Object} options.variables - Variables to substitute
 * @param {string} options.workingDirectory - Working directory for execution
 * @param {boolean} options.dryRun - Parse only, don't execute
 * @param {function} options.onStepStart - Callback for step start
 * @param {function} options.onStepComplete - Callback for step completion
 * @returns {Promise<ExecutionResult>} Execution result
 */
export async function executeWorkflow(workflow, options = {}) {
  const {
    variables = {},
    workingDirectory = process.cwd(),
    dryRun = false,
    onStepStart = () => {},
    onStepComplete = () => {}
  } = options;
  
  const startTime = Date.now();
  const stepResults = [];
  
  console.log(`\n🔷 Workflow: ${workflow.metadata.name}`);
  if (workflow.metadata.description) {
    console.log(`📝 ${workflow.metadata.description}\n`);
  }
  
  if (dryRun) {
    console.log('⚪ DRY RUN - No commands will be executed\n');
  }
  
  // Check required files
  if (workflow.metadata.context?.required_files) {
    const { required_files } = workflow.metadata.context;
    for (const file of required_files) {
      try {
        await execAsync(`test -f "${file}"`, { cwd: workingDirectory });
      } catch {
        return {
          success: false,
          exitCode: 1,
          stepResults: [],
          duration: Date.now() - startTime,
          summary: `Missing required file: ${file}`
        };
      }
    }
  }
  
  // Execute each step
  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    const stepStartTime = Date.now();
    
    onStepStart(step, i);
    
    console.log(`\n▶️  Step ${i + 1}/${workflow.steps.length}: ${step.id}`);
    if (step.description) {
      console.log(`   ${step.description}`);
    }
    
    let result;
    
    if (dryRun) {
      result = {
        stepId: step.id,
        type: step.type,
        success: true,
        skipped: true,
        output: '[DRY RUN] Command not executed',
        exitCode: 0,
        duration: 0
      };
    } else {
      result = await executeStep(step, {
        variables,
        workingDirectory,
        stepIndex: i
      });
    }
    
    result.duration = Date.now() - stepStartTime;
    stepResults.push(result);
    
    onStepComplete(step, i, result);
    
    // Show step result
    if (result.success) {
      if (result.skipped) {
        console.log(`   ⏭️  Skipped (dry run)`);
      } else {
        console.log(`   ✅ Completed (${result.duration}ms)`);
      }
    } else {
      console.log(`   ❌ Failed (exit code: ${result.exitCode})`);
      if (result.stderr) {
        console.log(`   Error: ${result.stderr.substring(0, 200)}`);
      }
      
      if (!step.optional) {
        const totalDuration = Date.now() - startTime;
        return {
          success: false,
          exitCode: result.exitCode,
          stepResults,
          duration: totalDuration,
          summary: `Workflow failed at step "${step.id}"` +
                   (result.stderr ? `: ${result.stderr.substring(0, 100)}` : '')
        };
      }
    }
    
    // Show output if present (and not too long)
    if (result.output && result.output.length > 0 && result.output.length < 1000) {
      const lines = result.output.split('\n').filter(l => l.trim());
      if (lines.length <= 5) {
        for (const line of lines) {
          console.log(`      ${line}`);
        }
      } else {
        console.log(`      (${lines.length} lines of output)`);
      }
    }
  }
  
  const totalDuration = Date.now() - startTime;
  const success = stepResults.every(r => r.success);
  
  console.log(`\n✅ Workflow completed in ${totalDuration}ms`);
  
  return {
    success,
    exitCode: success ? 0 : 1,
    stepResults,
    duration: totalDuration,
    summary: generateSummary(workflow, stepResults)
  };
}

/**
 * Execute a single step
 * @param {Object} step - Step object
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} Step execution result
 */
async function executeStep(step, context) {
  const { variables, workingDirectory } = context;
  
  // Substitute variables in code
  const code = substituteVariables(step.code, variables);
  
  try {
    switch (step.type) {
      case 'shell':
        return await executeShellStep(code, workingDirectory);
      
      case 'javascript':
        return await executeJavaScriptStep(code, workingDirectory);
      
      case 'python':
        return await executePythonStep(code, workingDirectory);
      
      case 'data':
        return {
          stepId: step.id,
          type: step.type,
          success: true,
          output: code,
          exitCode: 0,
          duration: 0
        };
      
      default:
        return {
          stepId: step.id,
          type: step.type,
          success: false,
          output: '',
          stderr: `Unknown step type: ${step.type}`,
          exitCode: 1
        };
    }
  } catch (error) {
    return {
      stepId: step.id,
      type: step.type,
      success: false,
      output: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.code || 1
    };
  }
}

/**
 * Execute a shell step
 * @param {string} code - Shell commands
 * @param {string} workingDirectory - Working directory
 * @returns {Promise<Object>} Execution result
 */
async function executeShellStep(code, workingDirectory) {
  const { stdout, stderr } = await execAsync(code, {
    cwd: workingDirectory,
    timeout: 300000, // 5 minute timeout
    maxBuffer: 10 * 1024 * 1024 // 10MB output buffer
  });
  
  return {
    stepId: code.substring(0, 30),
    type: 'shell',
    success: true,
    output: stdout,
    stderr,
    exitCode: 0
  };
}

/**
 * Execute a JavaScript step
 * @param {string} code - JavaScript code
 * @param {string} workingDirectory - Working directory
 * @returns {Promise<Object>} Execution result
 */
async function executeJavaScriptStep(code, workingDirectory) {
  // Create a temporary file for the code
  const tmpFile = join(workingDirectory, `.workflow-${Date.now()}.js`);
  
  // Wrap code in async IIFE and capture console output
  const wrappedCode = `
const originalLog = console.log;
const originalError = console.error;
const logs = [];

console.log = (...args) => {
  logs.push(['log', args.map(a => String(a)).join(' ')]);
  originalLog.apply(console, args);
};

console.error = (...args) => {
  logs.push(['error', args.map(a => String(a)).join(' ')]);
  originalError.apply(console, args);
};

(async () => {
  try {
${code.split('\n').map(l => '    ' + l).join('\n')}
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
`;
  
  try {
    await writeFile(tmpFile, wrappedCode, 'utf-8');
    
    const { stdout, stderr } = await execAsync(`node "${tmpFile}"`, {
      cwd: workingDirectory,
      timeout: 300000,
      maxBuffer: 10 * 1024 * 1024
    });
    
    return {
      stepId: code.substring(0, 30),
      type: 'javascript',
      success: true,
      output: stdout,
      stderr,
      exitCode: 0
    };
  } finally {
    // Clean up temp file
    try {
      await unlink(tmpFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Execute a Python step
 * @param {string} code - Python code
 * @param {string} workingDirectory - Working directory
 * @returns {Promise<Object>} Execution result
 */
async function executePythonStep(code, workingDirectory) {
  const tmpFile = join(workingDirectory, `.workflow-${Date.now()}.py`);
  
  try {
    await writeFile(tmpFile, code, 'utf-8');
    
    const { stdout, stderr } = await execAsync(`python3 "${tmpFile}"`, {
      cwd: workingDirectory,
      timeout: 300000,
      maxBuffer: 10 * 1024 * 1024
    });
    
    return {
      stepId: code.substring(0, 30),
      type: 'python',
      success: true,
      output: stdout,
      stderr,
      exitCode: 0
    };
  } catch (error) {
    return {
      stepId: code.substring(0, 30),
      type: 'python',
      success: false,
      output: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.code || 1
    };
  } finally {
    try {
      await unlink(tmpFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Generate execution summary
 * @param {Object} workflow - Workflow metadata
 * @param {Array} stepResults - Step execution results
 * @returns {string} Summary text
 */
function generateSummary(workflow, stepResults) {
  const total = stepResults.length;
  const passed = stepResults.filter(r => r.success).length;
  const failed = stepResults.filter(r => !r.success).length;
  
  let summary = `Workflow "${workflow.metadata.name}": ${passed}/${total} steps passed`;
  
  if (failed > 0) {
    summary += `, ${failed} failed`;
    const failedSteps = stepResults
      .filter(r => !r.success)
      .map(r => r.stepId)
      .join(', ');
    summary += ` (${failedSteps})`;
  }
  
  return summary;
}

export default {
  executeWorkflow,
  executeStep
};
