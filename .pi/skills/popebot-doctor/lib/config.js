/**
 * Configuration Diagnostics
 * Check environment variables and config files
 */

const fs = require('fs');
const path = require('path');

const JOB_ROOT = '/job';
const REQUIRED_ENV_VARS = [
  { name: 'GH_TOKEN', description: 'GitHub token for PR operations' },
  { name: 'GH_OWNER', description: 'GitHub repository owner' },
  { name: 'GH_REPO', description: 'GitHub repository name' }
];

const OPTIONAL_ENV_VARS = [
  { name: 'APP_URL', description: 'Application URL' },
  { name: 'AUTH_SECRET', description: 'Authentication secret' },
  { name: 'TELEGRAM_BOT_TOKEN', description: 'Telegram bot integration' },
  { name: 'LLM_PROVIDER', description: 'LLM provider (anthropic, openai, google)' },
  { name: 'LLM_MODEL', description: 'LLM model override' }
];

const CONFIG_FILES = [
  { path: '.env', required: false },
  { path: 'config/SOUL.md', required: false },
  { path: 'config/AGENT.md', required: false },
  { path: 'config/CRONS.json', required: false },
  { path: 'config/TRIGGERS.json', required: false }
];

/**
 * Run configuration diagnostics
 * @returns {Promise<Array>} Diagnostic items
 */
async function run() {
  const results = [];
  
  // Check required environment variables
  results.push(...checkRequiredEnvVars());
  
  // Check optional environment variables
  results.push(...checkOptionalEnvVars());
  
  // Check config files
  results.push(...checkConfigFiles());
  
  // Check JSON configs are valid
  results.push(...checkJSONConfigs());
  
  return results;
}

function checkRequiredEnvVars() {
  const results = [];
  
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar.name];
    const isPresent = value && value.length > 0;
    
    results.push({
      category: 'config',
      check: `env-${envVar.name.toLowerCase()}`,
      severity: isPresent ? 'ok' : 'error',
      message: isPresent 
        ? `${envVar.name} is set`
        : `${envVar.name} is missing`,
      details: envVar.description,
      ...(isPresent ? {} : { 
        remediation: `Set ${envVar.name} environment variable` 
      })
    });
  }
  
  return results;
}

function checkOptionalEnvVars() {
  const results = [];
  
  for (const envVar of OPTIONAL_ENV_VARS) {
    const value = process.env[envVar.name];
    const isPresent = value && value.length > 0;
    
    results.push({
      category: 'config',
      check: `env-${envVar.name.toLowerCase()}`,
      severity: isPresent ? 'ok' : 'warning',
      message: isPresent 
        ? `${envVar.name} is set`
        : `${envVar.name} not set (optional)`,
      details: envVar.description
    });
  }
  
  return results;
}

function checkConfigFiles() {
  const results = [];
  
  for (const configFile of CONFIG_FILES) {
    const fullPath = path.join(JOB_ROOT, configFile.path);
    const exists = fs.existsSync(fullPath);
    
    results.push({
      category: 'config',
      check: `file-${configFile.path.replace(/\//g, '-')}`,
      severity: exists ? 'ok' : (configFile.required ? 'error' : 'warning'),
      message: exists 
        ? `${configFile.path} exists`
        : `${configFile.path} not found`,
      ...(exists || !configFile.required ? {} : {
        remediation: `Create ${configFile.path}`
      })
    });
  }
  
  // Check if .pi directory exists
  const piDir = path.join(JOB_ROOT, '.pi');
  const piExists = fs.existsSync(piDir);
  results.push({
    category: 'config',
    check: 'file-dot-pi-directory',
    severity: piExists ? 'ok' : 'error',
    message: piExists ? '.pi directory exists' : '.pi directory missing',
    ...(piExists ? {} : { remediation: `Create: mkdir -p ${piDir}/skills` })
  });
  
  return results;
}

function checkJSONConfigs() {
  const results = [];
  const jsonFiles = ['config/CRONS.json', 'config/TRIGGERS.json'];
  
  for (const jsonFile of jsonFiles) {
    const fullPath = path.join(JOB_ROOT, jsonFile);
    
    if (!fs.existsSync(fullPath)) {
      continue; // Skip if not present - checked above
    }
    
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      JSON.parse(content);
      
      results.push({
        category: 'config',
        check: `json-valid-${jsonFile.replace(/\//g, '-')}`,
        severity: 'ok',
        message: `${jsonFile} is valid JSON`
      });
    } catch (err) {
      results.push({
        category: 'config',
        check: `json-valid-${jsonFile.replace(/\//g, '-')}`,
        severity: 'error',
        message: `${jsonFile} has JSON syntax error`,
        remediation: `Fix JSON syntax: ${err.message}`
      });
    }
  }
  
  // Check package.json in project root
  const packageJsonPath = path.join(JOB_ROOT, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const content = fs.readFileSync(packageJsonPath, 'utf8');
      JSON.parse(content);
      
      results.push({
        category: 'config',
        check: 'json-valid-package-json',
        severity: 'ok',
        message: 'package.json is valid JSON'
      });
    } catch (err) {
      results.push({
        category: 'config',
        check: 'json-valid-package-json',
        severity: 'error',
        message: 'package.json has JSON syntax error',
        remediation: `Fix package.json: ${err.message}`
      });
    }
  }
  
  return results;
}

module.exports = { run };
