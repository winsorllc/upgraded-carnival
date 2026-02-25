#!/usr/bin/env node
/**
 * Diff Viewer - File comparison tool
 * Inspired by OpenClaw's diff.ts extension
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

class DiffViewer {
  constructor() {
    this.options = {
      unified: false,
      context: 3,
      sideBySide: false,
      patch: false,
      output: null,
      dir: false,
      color: true,
      noColor: false,
    };
  }

  parseArgs(args) {
    const files = [];
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--unified' || arg === '-u') this.options.unified = true;
      else if (arg === '--side-by-side' || arg === '-s') this.options.sideBySide = true;
      else if (arg === '--patch' || arg === '-p') this.options.patch = true;
      else if (arg === '--dir' || arg === '-d') this.options.dir = true;
      else if (arg === '--no-color') { this.options.noColor = true; this.options.color = false; }
      else if (arg.startsWith('--context=')) this.options.context = parseInt(arg.split('=')[1]) || 3;
      else if (arg === '--context' || arg === '-c') {
        i++;
        this.options.context = parseInt(args[i]) || 3;
      }
      else if (arg.startsWith('--output=')) this.options.output = arg.split('=')[1];
      else if (arg === '--output' || arg === '-o') {
        i++;
        this.options.output = args[i];
      }
      else if (!arg.startsWith('-')) files.push(arg);
    }

    return files;
  }

  colorize(text, color) {
    if (!this.options.color) return text;
    return `${colors[color]}${text}${colors.reset}`;
  }

  // Myers diff algorithm - simplified
  computeDiff(oldLines, newLines) {
    const m = oldLines.length;
    const n = newLines.length;
    
    if (m === 0) return { changes: newLines.map((line, i) => ({ type: 'insert', line, oldIndex: -1, newIndex: i })) };
    if (n === 0) return { changes: oldLines.map((line, i) => ({ type: 'delete', line, oldIndex: i, newIndex: -1 })) };

    // Simple LCS-based diff
    const changes = [];
    let oldIdx = 0, newIdx = 0;

    while (oldIdx < m || newIdx < n) {
      if (oldIdx < m && newIdx < n && oldLines[oldIdx] === newLines[newIdx]) {
        changes.push({ type: 'equal', line: oldLines[oldIdx], oldIndex: oldIdx, newIndex: newIdx });
        oldIdx++;
        newIdx++;
      } else if (newIdx < n && (oldIdx >= m || !oldLines.slice(oldIdx).includes(newLines[newIdx]))) {
        changes.push({ type: 'insert', line: newLines[newIdx], oldIndex: -1, newIndex: newIdx });
        newIdx++;
      } else if (oldIdx < m) {
        changes.push({ type: 'delete', line: oldLines[oldIdx], oldIndex: oldIdx, newIndex: -1 });
        oldIdx++;
      } else {
        newIdx++;
      }
    }

    return { changes };
  }

  formatUnifiedDiff(oldLines, newLines, oldPath, newPath, context) {
    const { changes } = this.computeDiff(oldLines, newLines);
    const output = [];

    // Unified diff header
    output.push(`--- ${oldPath}`);
    output.push(`+++ ${newPath}`);

    // Group changes into hunks
    const hunks = [];
    let currentHunk = [];
    let lastChange = -1;

    changes.forEach((change, idx) => {
      if (change.type !== 'equal') {
        // Start a new hunk if needed
        const startIndex = Math.max(0, idx - context);
        const endIndex = Math.min(changes.length, idx + context + 1);
        
        if (currentHunk.length === 0 || startIndex > lastChange + context) {
          if (currentHunk.length > 0) hunks.push(currentHunk);
          currentHunk = changes.slice(startIndex, endIndex);
        } else {
          // Extend current hunk
          currentHunk = changes.slice(Math.max(0, currentHunk[0] ? changes.indexOf(currentHunk[0]) : 0), endIndex);
        }
        lastChange = idx;
      }
    });

    if (currentHunk.length > 0) hunks.push(currentHunk);

    hunks.forEach(hunk => {
      const oldStart = hunk[0]?.oldIndex + 1 || 0;
      const newStart = hunk[0]?.newIndex + 1 || 0;
      const oldCount = hunk.filter(c => c.type !== 'insert').length;
      const newCount = hunk.filter(c => c.type !== 'delete').length;
      
      output.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`);

      hunk.forEach(change => {
        if (change.type === 'equal') {
          output.push(` ${change.line}`);
        } else if (change.type === 'delete') {
          output.push(this.colorize(`-${change.line}`, 'red'));
        } else if (change.type === 'insert') {
          output.push(this.colorize(`+${change.line}`, 'green'));
        }
      });
    });

    return output.join('\n');
  }

  formatSideBySide(oldLines, newLines, width = 80) {
    const halfWidth = Math.floor((width - 7) / 2);
    const output = [];

    const { changes } = this.computeDiff(oldLines, newLines);

    output.push(`${'OLD'.padEnd(halfWidth)}  |  ${'NEW'.padEnd(halfWidth)}`);
    output.push('-'.repeat(width));

    changes.forEach(change => {
      const oldLine = change.type !== 'insert' 
        ? change.line.substring(0, halfWidth).padEnd(halfWidth)
        : ''.padEnd(halfWidth);
      const newLine = change.type !== 'delete' 
        ? change.line.substring(0, halfWidth).padEnd(halfWidth)
        : ''.padEnd(halfWidth);
      
      const marker = change.type === 'equal' ? ' ' : change.type === 'delete' ? '<' : '>';
      
      if (change.type === 'equal') {
        output.push(`${oldLine} ${marker} ${newLine}`);
      } else if (change.type === 'delete') {
        output.push(`${this.colorize(oldLine, 'bgRed')} ${marker} ${newLine}`);
      } else if (change.type === 'insert') {
        output.push(`${oldLine} ${marker} ${this.colorize(newLine, 'bgGreen')}`);
      }
    });

    return output.join('\n');
  }

  formatNormal(oldLines, newLines) {
    const { changes } = this.computeDiff(oldLines, newLines);
    const output = [];

    changes.forEach(change => {
      if (change.type === 'delete') {
        output.push(this.colorize(`< ${change.line}`, 'red'));
      } else if (change.type === 'insert') {
        output.push(this.colorize(`> ${change.line}`, 'green'));
      }
    });

    return output.join('\n');
  }

  compareFiles(oldPath, newPath) {
    if (!fs.existsSync(oldPath)) {
      console.error(`Error: ${oldPath} does not exist`);
      process.exit(1);
    }
    if (!fs.existsSync(newPath)) {
      console.error(`Error: ${newPath} does not exist`);
      process.exit(1);
    }

    const oldContent = fs.readFileSync(oldPath, 'utf8');
    const newContent = fs.readFileSync(newPath, 'utf8');

    // Check if identical
    if (oldContent === newContent) {
      console.log(this.colorize('Files are identical', 'green'));
      return '';
    }

    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    let output;
    if (this.options.sideBySide) {
      output = this.formatSideBySide(oldLines, newLines);
    } else if (this.options.unified || this.options.patch) {
      output = this.formatUnifiedDiff(oldLines, newLines, oldPath, newPath, this.options.context);
    } else {
      output = this.formatNormal(oldLines, newLines);
    }

    return output;
  }

  run() {
    const files = this.parseArgs(process.argv.slice(2));

    if (files.length < 2) {
      console.log('Diff Viewer - Compare files and generate diffs');
      console.log('');
      console.log('Usage: diff.js [options] <old-file> <new-file>');
      console.log('');
      console.log('Options:');
      console.log('  -u, --unified        Unified diff format (default)');
      console.log('  -s, --side-by-side   Side-by-side comparison');
      console.log('  -p, --patch          Generate patch format');
      console.log('  -c, --context N      Number of context lines (default: 3)');
      console.log('  -o, --output FILE    Write output to file');
      console.log('      --no-color       Disable color output');
      console.log('');
      process.exit(1);
    }

    const oldPath = files[0];
    const newPath = files[1];

    console.log(this.colorize(`Comparing ${oldPath} → ${newPath}`, 'cyan'));
    console.log();

    const output = this.compareFiles(oldPath, newPath);

    if (output) {
      if (this.options.output) {
        fs.writeFileSync(this.options.output, output.replace(/\x1b\[\d+m/g, ''));
        console.log(this.colorize(`\nDiff written to: ${this.options.output}`, 'green'));
      } else {
        console.log(output);
        
        const oldLines = fs.readFileSync(oldPath, 'utf8').split('\n').length;
        const newLines = fs.readFileSync(newPath, 'utf8').split('\n').length;
        console.log(`\n${this.colorize('Summary:', 'cyan')} ${oldLines} lines → ${newLines} lines`);
      }
    }
  }
}

// Run if called directly
if (require.main === module) {
  const viewer = new DiffViewer();
  viewer.run();
}

module.exports = { DiffViewer };
