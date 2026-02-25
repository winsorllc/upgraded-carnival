/**
 * Workflow Markdown Skill
 * 
 * Main entry point for the workflow-markdown skill.
 * Provides tools for discovering, validating, and executing markdown-based workflows.
 * 
 * @module workflow-markdown
 */

import { findWorkflows, loadWorkflowByName, createWorkflowTemplate, formatWorkflowList } from './lib/workflows.js';
import { parseWorkflow, validateWorkflow, substituteVariables } from './lib/parser.js';
import { executeWorkflow } from './lib/executor.js';
import { readFile } from 'fs/promises';

// Re-export core functions
export { parseWorkflow, validateWorkflow, executeWorkflow };
export { findWorkflows, loadWorkflowByName, createWorkflowTemplate };
export { substituteVariables };

/**
 * List available workflows
 * @param {Object} params - Parameters
 * @param {string} [params.tag] - Filter by tag
 * @param {boolean} [params.verbose=false] - Show detailed information
 * @returns {Promise<Object>} Workflow list result
 */
export async function workflow_list(params = {}) {
  const { tag, verbose = false } = params;
  
  try {
    let workflows = await findWorkflows();
    
    if (tag) {
      const { filterByTag } = await import('./lib/workflows.js');
      workflows = filterByTag(workflows, tag);
    }
    
    if (verbose) {
      return {
        success: true,
        count: workflows.length,
        workflows: workflows.map(w => ({
          name: w.name,
          path: w.relativePath,
          description: w.metadata.description,
          tags: w.tags,
          steps: w.steps
        }))
      };
    }
    
    return {
      success: true,
      count: workflows.length,
      workflows: workflows.map(w => w.name),
      formatted: formatWorkflowList(workflows)
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Run a workflow
 * @param {Object} params - Parameters
 * @param {string} params.name - Workflow name to execute
 * @param {Object} [params.variables={}] - Variables to substitute
 * @param {boolean} [params.dryRun=false] - Dry run mode (parse only)
 * @param {string} [params.workingDirectory] - Working directory
 * @returns {Promise<Object>} Execution result
 */
export async function workflow_run(params) {
  const { name, variables = {}, dryRun = false, workingDirectory } = params;
  
  if (!name) {
    return {
      success: false,
      error: 'Parameter "name" is required'
    };
  }
  
  try {
    const workflow = await loadWorkflowByName(name);
    const result = await executeWorkflow(workflow, {
      variables,
      dryRun,
      workingDirectory
    });
    
    return {
      success: result.success,
      workflow: workflow.metadata.name,
      summary: result.summary,
      duration: result.duration,
      exitCode: result.exitCode,
      stepResults: result.stepResults.map(r => ({
        stepId: r.stepId,
        success: r.success,
        skipped: r.skipped || false,
        exitCode: r.exitCode,
        duration: r.duration,
        output: r.output?.substring(0, 500) // Truncate long outputs
      }))
    };
    
  } catch (error) {
    return {
      success: false,
      workflow: name,
      error: error.message
    };
  }
}

/**
 * Validate a workflow without executing
 * @param {Object} params - Parameters
 * @param {string} params.name - Workflow name or path to validate
 * @returns {Promise<Object>} Validation result
 */
export async function workflow_validate(params) {
  const { name } = params;
  
  if (!name) {
    return {
      valid: false,
      errors: ['Parameter "name" is required']
    };
  }
  
  try {
    // Try to load by name first
    let content;
    try {
      const workflow = await loadWorkflowByName(name);
      // Reload to get raw content for validation
      const { readFile } = await import('fs/promises');
      const workflows = await findWorkflows();
      const match = workflows.find(w => w.name === name);
      if (match) {
        content = await readFile(match.path, 'utf-8');
      }
    } catch {
      // Try as file path
      content = await readFile(name, 'utf-8');
    }
    
    const validation = validateWorkflow(content);
    
    return {
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      workflow: validation.workflow ? {
        name: validation.workflow.metadata.name,
        description: validation.workflow.metadata.description,
        steps: validation.workflow.steps.length
      } : null
    };
    
  } catch (error) {
    return {
      valid: false,
      errors: [error.message],
      warnings: []
    };
  }
}

/**
 * Create a new workflow from template
 * @param {Object} params - Parameters
 * @param {string} params.name - New workflow name
 * @param {string} [params.description=''] - Workflow description
 * @param {string} [params.path] - Output path (defaults to .agent/workflows/{name}.md)
 * @param {string[]} [params.tags=[]] - Workflow tags
 * @returns {Promise<Object>} Creation result
 */
export async function workflow_template(params) {
  const { name, description = '', path, tags = [] } = params;
  
  if (!name) {
    return {
      success: false,
      error: 'Parameter "name" is required'
    };
  }
  
  const outputPath = path || `.agent/workflows/${name.toLowerCase().replace(/\s+/g, '-')}.md`;
  
  try {
    await createWorkflowTemplate({
      name,
      description,
      path: outputPath,
      tags
    });
    
    return {
      success: true,
      path: outputPath,
      message: `Created workflow template at ${outputPath}`
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get detailed information about a workflow
 * @param {Object} params - Parameters
 * @param {string} params.name - Workflow name
 * @returns {Promise<Object>} Workflow details
 */
export async function workflow_info(params) {
  const { name } = params;
  
  if (!name) {
    return {
      success: false,
      error: 'Parameter "name" is required'
    };
  }
  
  try {
    const { getWorkflowDetails, findWorkflows } = await import('./lib/workflows.js');
    const workflows = await findWorkflows();
    const match = workflows.find(w => 
      w.name === name || w.name.toLowerCase() === name.toLowerCase()
    );
    
    if (!match) {
      return {
        success: false,
        error: `Workflow "${name}" not found`
      };
    }
    
    const details = await getWorkflowDetails(match.path);
    
    return {
      success: true,
      workflow: {
        name: details.name,
        description: details.description,
        tags: details.tags,
        steps: details.steps,
        validation: details.validation
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Default export with all functions
export default {
  // Main tool functions
  workflow_list,
  workflow_run,
  workflow_validate,
  workflow_template,
  workflow_info,
  
  // Core modules
  parseWorkflow,
  validateWorkflow,
  executeWorkflow,
  findWorkflows,
  loadWorkflowByName,
  createWorkflowTemplate,
  substituteVariables
};
