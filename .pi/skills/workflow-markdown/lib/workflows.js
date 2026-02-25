/**
 * Workflow Discovery and Management
 * 
 * Discovers, lists, and manages markdown workflow files.
 */
import { readdir, readFile, stat, access, writeFile } from 'fs/promises';
import { join, basename, extname } from 'path';
import { parseWorkflow, validateWorkflow } from './parser.js';

// Default search paths (in order of priority)
const DEFAULT_SEARCH_PATHS = [
  '.agent/workflows',
  '.pi/workflows',
  'workflows',
  '.workflows'
];

/**
 * @typedef {Object} WorkflowInfo
 * @property {string} name - Workflow name
 * @property {string} path - Full file path
 * @property {string} relativePath - Relative file path
 * @property {Object} metadata - Parsed frontmatter
 * @property {number} steps - Number of executable steps
 */

/**
 * Find all workflow files in search paths
 * @param {Object} options - Search options
 * @param {string} options.basePath - Base directory to search from
 * @param {string[]} options.additionalPaths - Additional paths to search
 * @returns {Promise<WorkflowInfo[]>} Array of workflow info objects
 */
export async function findWorkflows(options = {}) {
  const { 
    basePath = process.cwd(),
    additionalPaths = []
  } = options;
  
  const searchPaths = [...DEFAULT_SEARCH_PATHS, ...additionalPaths]
    .map(p => join(basePath, p));
  
  const workflows = [];
  
  for (const dirPath of searchPaths) {
    try {
      // Check if directory exists
      await access(dirPath);
      const dirStat = await stat(dirPath);
      
      if (!dirStat.isDirectory()) {
        continue;
      }
      
      // Read directory contents
      const entries = await readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        // Only process .md files
        if (entry.isFile() && extname(entry.name) === '.md') {
          const filePath = join(dirPath, entry.name);
          
          try {
            const workflow = await loadWorkflow(filePath, basePath);
            if (workflow) {
              workflows.push(workflow);
            }
          } catch (error) {
            // Log but continue searching
            console.error(`Warning: Failed to load workflow ${filePath}: ${error.message}`);
          }
        }
      }
    } catch {
      // Directory doesn't exist, skip silently
      continue;
    }
  }
  
  // Sort by name for consistent ordering
  return workflows.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Load a single workflow file
 * @param {string} filePath - Path to workflow file
 * @param {string} basePath - Base directory for relative path calculation
 * @returns {Promise<WorkflowInfo|null>} Workflow info or null if invalid
 */
export async function loadWorkflow(filePath, basePath = process.cwd()) {
  const content = await readFile(filePath, 'utf-8');
  const parsed = parseWorkflow(content);
  
  const relativePath = filePath.startsWith(basePath) 
    ? filePath.substring(basePath.length + 1)
    : filePath;
  
  return {
    name: parsed.metadata.name,
    path: filePath,
    relativePath,
    metadata: parsed.metadata,
    steps: parsed.steps.length,
    tags: parsed.metadata.tags || []
  };
}

/**
 * Load and parse a full workflow by name
 * @param {string} name - Workflow name
 * @param {Object} options - Loading options
 * @returns {Promise<Object>} Parsed workflow with steps
 */
export async function loadWorkflowByName(name, options = {}) {
  const { basePath = process.cwd() } = options;
  
  const workflows = await findWorkflows({ basePath });
  const match = workflows.find(w => 
    w.name === name || 
    w.name.toLowerCase() === name.toLowerCase() ||
    basename(w.path, '.md') === name
  );
  
  if (!match) {
    const available = workflows.map(w => w.name).join(', ');
    throw new Error(`Workflow "${name}" not found. Available: ${available || 'none'}`);
  }
  
  const content = await readFile(match.path, 'utf-8');
  return parseWorkflow(content);
}

/**
 * Filter workflows by tag
 * @param {WorkflowInfo[]} workflows - Array of workflows
 * @param {string} tag - Tag to filter by
 * @returns {WorkflowInfo[]} Filtered workflows
 */
export function filterByTag(workflows, tag) {
  const lowerTag = tag.toLowerCase();
  return workflows.filter(w => 
    w.tags?.some(t => t.toLowerCase() === lowerTag)
  );
}

/**
 * Get detailed information about a workflow
 * @param {string} workflowPath - Path to workflow file
 * @returns {Promise<Object>} Detailed workflow information
 */
export async function getWorkflowDetails(workflowPath) {
  const content = await readFile(workflowPath, 'utf-8');
  const parsed = parseWorkflow(content);
  const validation = validateWorkflow(content);
  
  return {
    ...parsed.metadata,
    steps: parsed.steps.map(s => ({
      id: s.id,
      type: s.type,
      language: s.language,
      description: s.description,
      optional: s.optional,
      codeLength: s.code.length
    })),
    validation: {
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings
    },
    content: parsed.content
  };
}

/**
 * Create a new workflow from template
 * @param {Object} options - Template options
 * @param {string} options.name - Workflow name
 * @param {string} options.description - Workflow description
 * @param {string} options.path - Output file path
 * @param {string[]} options.tags - Workflow tags
 * @returns {Promise<string>} Created file path
 */
export async function createWorkflowTemplate(options) {
  const {
    name,
    description = '',
    path,
    tags = []
  } = options;
  
  const template = `---
name: ${name}
description: ${description}
tags:${tags.length > 0 ? '\n' + tags.map(t => `  - ${t}`).join('\n') : ' []'}
---

# ${name}

${description}

## Step 1: Setup

Describe what this step does.

\`\`\`shell:setup
echo "Setting up..."
\`\`\`

## Step 2: Execute

Main action goes here.

\`\`\`shell:execute
echo "Executing workflow..."
\`\`\`

## Step 3: Verify

Check results.

\`\`\`shell:verify
echo "Verifying..."
\`\`\`

## Step 4: Report

Generate report.

\`\`\`javascript:report
console.log("Workflow completed successfully!");
\`\`\`
`;

  // Ensure directory exists
  const dir = join(...path.split('/').slice(0, -1));
  try {
    await access(dir);
  } catch {
    await import('fs/promises').then(fs => 
      fs.mkdir(dir, { recursive: true })
    );
  }
  
  await writeFile(path, template, 'utf-8');
  return path;
}

/**
 * Format workflow list for display
 * @param {WorkflowInfo[]} workflows - Workflows to format
 * @returns {string} Formatted text
 */
export function formatWorkflowList(workflows) {
  if (workflows.length === 0) {
    return 'No workflows found. Create one in .agent/workflows/';
  }
  
  const lines = workflows.map(w => {
    const tags = w.tags.length > 0 ? ` [${w.tags.join(', ')}]` : '';
    return `  • ${w.name}${tags} (${w.steps} steps)`;
  });
  
  return `Found ${workflows.length} workflow(s):\n\n${lines.join('\n')}`;
}

export default {
  findWorkflows,
  loadWorkflow,
  loadWorkflowByName,
  getWorkflowDetails,
  filterByTag,
  createWorkflowTemplate,
  formatWorkflowList
};
