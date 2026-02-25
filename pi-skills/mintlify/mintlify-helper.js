#!/usr/bin/env node

/**
 * Mintlify Helper Tool
 * 
 * Provides CLI commands for common Mintlify documentation tasks.
 * Part of the PopeBot Mintlify Skill.
 * 
 * Usage:
 *   mintlify-helper validate <docsDir>     - Validate docs structure
 *   mintlify-helper check-frontmatter <dir> - Check for missing frontmatter
 *   mintlify-helper extract-nav <docsJson>  - Extract navigation structure
 */

const fs = require('fs');
const path = require('path');

function validateDocsStructure(docsDir) {
  const errors = [];
  const warnings = [];
  
  if (!fs.existsSync(docsDir)) {
    console.error(`Error: Directory not found: ${docsDir}`);
    process.exit(1);
  }
  
  // Check for docs.json
  const docsJsonPath = path.join(docsDir, 'docs.json');
  if (!fs.existsSync(docsJsonPath)) {
    errors.push('Missing docs.json configuration file');
  } else {
    try {
      const docsJson = JSON.parse(fs.readFileSync(docsJsonPath, 'utf-8'));
      if (!docsJson.name) {
        warnings.push('docs.json missing "name" field');
      }
      if (!docsJson.navigation) {
        warnings.push('docs.json missing "navigation" field');
      }
    } catch (e) {
      errors.push(`Invalid docs.json: ${e.message}`);
    }
  }
  
  // Check for index/intro page
  const possibleIntros = ['index.mdx', 'index.md', 'introduction.mdx', 'introduction.md'];
  const hasIntro = possibleIntros.some(f => fs.existsSync(path.join(docsDir, f)));
  if (!hasIntro) {
    warnings.push('No index or introduction page found');
  }
  
  return { errors, warnings };
}

function checkFrontmatter(dir) {
  const results = { valid: [], missing: [], invalid: [] };
  
  function scanDirectory(directory) {
    const files = fs.readdirSync(directory);
    
    for (const file of files) {
      const fullPath = path.join(directory, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        
        if (!frontmatterMatch) {
          results.missing.push(fullPath);
        } else {
          try {
            const frontmatter = frontmatterMatch[1];
            const hasTitle = frontmatter.includes('title:');
            const hasDescription = frontmatter.includes('description:');
            
            if (hasTitle && hasDescription) {
              results.valid.push(fullPath);
            } else {
              results.invalid.push({ path: fullPath, reason: 'Missing required fields' });
            }
          } catch (e) {
            results.invalid.push({ path: fullPath, reason: e.message });
          }
        }
      }
    }
  }
  
  scanDirectory(dir);
  return results;
}

function extractNavStructure(docsJsonPath) {
  if (!fs.existsSync(docsJsonPath)) {
    console.error(`Error: File not found: ${docsJsonPath}`);
    process.exit(1);
  }
  
  const docsJson = JSON.parse(fs.readFileSync(docsJsonPath, 'utf-8'));
  const nav = docsJson.navigation || [];
  
  console.log('\n📖 Navigation Structure:\n');
  
  function printNavItem(item, indent = 0) {
    const prefix = '  '.repeat(indent);
    if (item.slug) {
      console.log(`${prefix}📄 ${item.title || item.slug}`);
    } else if (item.group) {
      console.log(`${prefix}📁 ${item.group}`);
    }
    if (item.items) {
      for (const subItem of item.items) {
        printNavItem(subItem, indent + 1);
      }
    }
  }
  
  for (const item of nav) {
    printNavItem(item);
  }
  
  console.log('');
}

// Main CLI handler
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'validate': {
    const docsDir = args[1] || 'docs';
    const { errors, warnings } = validateDocsStructure(docsDir);
    
    console.log('\n📖 Mintlify Documentation Validator\n');
    
    if (errors.length > 0) {
      console.log('❌ Errors:');
      errors.forEach(e => console.log(`  - ${e}`));
    }
    
    if (warnings.length > 0) {
      console.log('⚠️  Warnings:');
      warnings.forEach(w => console.log(`  - ${w}`));
    }
    
    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ Documentation structure looks good!');
    }
    break;
  }
  
  case 'check-frontmatter': {
    const dir = args[1] || 'docs';
    const results = checkFrontmatter(dir);
    
    console.log('\n📖 Frontmatter Check Results\n');
    console.log(`✅ Valid pages: ${results.valid.length}`);
    console.log(`⚠️  Missing frontmatter: ${results.missing.length}`);
    console.log(`❌ Invalid frontmatter: ${results.invalid.length}`);
    
    if (results.missing.length > 0) {
      console.log('\nPages missing frontmatter:');
      results.missing.forEach(p => console.log(`  - ${p}`));
    }
    
    if (results.invalid.length > 0) {
      console.log('\nInvalid frontmatter:');
      results.invalid.forEach(i => console.log(`  - ${i.path}: ${i.reason}`));
    }
    break;
  }
  
  case 'extract-nav': {
    const docsJsonPath = args[1] || 'docs/docs.json';
    extractNavStructure(docsJsonPath);
    break;
  }
  
  default:
    console.log(`
📖 Mintlify Helper Tool

Usage:
  mintlify-helper validate <docsDir>          Validate docs structure
  mintlify-helper check-frontmatter <dir>     Check for missing frontmatter  
  mintlify-helper extract-nav <docsJson>      Extract navigation structure

Examples:
  mintlify-helper validate
  mintlify-helper validate docs
  mintlify-helper check-frontmatter docs
  mintlify-helper extract-nav docs/docs.json
`);
    break;
}
