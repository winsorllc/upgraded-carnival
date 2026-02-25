/**
 * Workflow Markdown Parser
 * 
 * Parses markdown workflow files with YAML frontmatter and executable code blocks.
 * Based on the OpenClaw agent workflow format.
 */
import YAML from 'yaml';
import { marked } from 'marked';

/**
 * Parse a workflow markdown file
 * @param {string} content - Raw markdown content
 * @returns {Object} Parsed workflow with metadata and steps
 */
export function parseWorkflow(content) {
  // Extract frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (!frontmatterMatch) {
    throw new Error('Workflow file must start with YAML frontmatter (---)');
  }
  
  const [, frontmatterYaml, markdownContent] = frontmatterMatch;
  
  // Parse YAML frontmatter
  let metadata;
  try {
    metadata = YAML.parse(frontmatterYaml);
  } catch (error) {
    throw new Error(`Failed to parse YAML frontmatter: ${error.message}`);
  }
  
  // Validate required fields
  if (!metadata.name) {
    throw new Error('Workflow must have a "name" in frontmatter');
  }
  
  // Parse markdown content for steps
  const steps = parseSteps(markdownContent);
  
  return {
    metadata: {
      name: metadata.name,
      description: metadata.description || '',
      tags: metadata.tags || [],
      requiresConfirmation: metadata.requires_confirmation || false,
      context: metadata.context || {},
      ...metadata
    },
    content: markdownContent.trim(),
    steps
  };
}

/**
 * Parse executable steps from markdown content
 * @param {string} markdownContent - Markdown content (without frontmatter)
 * @returns {Array} Array of step objects
 */
function parseSteps(markdownContent) {
  const steps = [];
  
  // Match code blocks with optional step identifier
  // Format: ```language:step-id or ```language
  const codeBlockRegex = /```(\w+)(?::([^\s\n]+))?\n([\s\S]*?)```/g;
  
  let match;
  while ((match = codeBlockRegex.exec(markdownContent)) !== null) {
    const [, language, stepId, code] = match;
    
    // Extract preceding heading as description
    const beforeBlock = markdownContent.substring(0, match.index);
    const lines = beforeBlock.split('\n');
    let description = '';
    
    // Look for the closest heading before this code block
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('## ') || line.startsWith('### ')) {
        description = line.replace(/^#+\s*/, '');
        break;
      }
    }
    
    // Determine step type from language
    const stepType = getStepType(language);
    
    steps.push({
      id: stepId || `step-${steps.length + 1}`,
      type: stepType,
      language: language.toLowerCase(),
      code: code.trim(),
      description,
      optional: stepId?.includes('optional') || false
    });
  }
  
  return steps;
}

/**
 * Get step type from language
 * @param {string} language - Code block language
 * @returns {string} Step type
 */
function getStepType(language) {
  const lang = language.toLowerCase();
  
  if (['sh', 'bash', 'shell', 'zsh'].includes(lang)) {
    return 'shell';
  }
  if (['js', 'javascript', 'node'].includes(lang)) {
    return 'javascript';
  }
  if (['py', 'python'].includes(lang)) {
    return 'python';
  }
  if (['json', 'yaml', 'yml'].includes(lang)) {
    return 'data';
  }
  
  return 'code';
}

/**
 * Validate a workflow file
 * @param {string} content - Raw markdown content
 * @returns {Object} Validation result
 */
export function validateWorkflow(content) {
  const errors = [];
  const warnings = [];
  
  try {
    const workflow = parseWorkflow(content);
    
    // Warn if no steps found
    if (workflow.steps.length === 0) {
      warnings.push('No executable code blocks found in workflow');
    }
    
    // Warn if no description
    if (!workflow.metadata.description) {
      warnings.push('Workflow is missing a description in frontmatter');
    }
    
    // Check for duplicate step IDs
    const stepIds = workflow.steps.map(s => s.id);
    const duplicates = stepIds.filter((id, index) => stepIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate step IDs found: ${duplicates.join(', ')}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      workflow: errors.length === 0 ? workflow : null
    };
    
  } catch (error) {
    return {
      valid: false,
      errors: [error.message],
      warnings,
      workflow: null
    };
  }
}

/**
 * Substitute variables in code
 * @param {string} code - Code string with potential {{variable}} placeholders
 * @param {Object} variables - Variable values
 * @returns {string} Code with substituted values
 */
export function substituteVariables(code, variables = {}) {
  let result = code;
  
  // Replace {{variable}} or {{ variable }} patterns
  const varRegex = /\{\{\s*(\w+)\s*\}\}/g;
  
  result = result.replace(varRegex, (match, varName) => {
    if (varName in variables) {
      return String(variables[varName]);
    }
    return match; // Keep original if not found
  });
  
  return result;
}

/**
 * Extract headings from markdown
 * @param {string} content - Markdown content
 * @returns {Array} Array of heading objects
 */
export function extractHeadings(content) {
  const headings = [];
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].trim()
    });
  }
  
  return headings;
}

/**
 * Render markdown to HTML (for documentation)
 * @param {string} content - Markdown content
 * @returns {string} HTML
 */
export function renderMarkdown(content) {
  return marked.parse(content);
}

export default {
  parseWorkflow,
  validateWorkflow,
  substituteVariables,
  extractHeadings,
  renderMarkdown
};
