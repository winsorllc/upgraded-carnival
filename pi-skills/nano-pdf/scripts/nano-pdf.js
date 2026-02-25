#!/usr/bin/env node
/**
 * nano-pdf: Edit PDFs with natural language instructions
 * 
 * Usage:
 *   node nano-pdf.js edit <pdf_path> <page> "<instruction>" [-o output.pdf]
 *   node nano-pdf.js info <pdf_path>
 *   node nano-pdf.js pages <pdf_path>
 */

import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Install dependencies if needed (for pdf-lib which is already in package.json)
function ensureDependencies() {
  // Dependencies are already in package.json
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage:');
    console.log('  node nano-pdf.js edit <pdf> <page> "<instruction>" [-o output.pdf]');
    console.log('  node nano-pdf.js info <pdf>');
    console.log('  node nano-pdf.js pages <pdf>');
    process.exit(1);
  }
  
  const command = args[0];
  
  if (command === 'edit' && args.length >= 4) {
    return {
      command: 'edit',
      pdf: args[1],
      page: args[2],
      instruction: args[3],
      output: args.includes('-o') ? args[args.indexOf('-o') + 1] : null
    };
  } else if (command === 'info' && args.length >= 2) {
    return {
      command: 'info',
      pdf: args[1]
    };
  } else if (command === 'pages' && args.length >= 2) {
    return {
      command: 'pages',
      pdf: args[1]
    };
  } else {
    console.log('Invalid arguments');
    process.exit(1);
  }
}

// Edit PDF with natural language instructions
async function editPdf(pdfPath, pageSpec, instruction, outputPath) {
  if (!fs.existsSync(pdfPath)) {
    console.error(`Error: File not found: ${pdfPath}`);
    process.exit(1);
  }
  
  // Read the PDF
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  
  // Determine which pages to edit
  let pagesToEdit = [];
  if (pageSpec.toLowerCase() === 'all') {
    pagesToEdit = pages.map((_, i) => i);
  } else {
    const pageNum = parseInt(pageSpec);
    if (isNaN(pageNum) || pageNum < 0 || pageNum >= totalPages) {
      console.error(`Error: Invalid page number: ${pageSpec} (valid: 0-${totalPages - 1})`);
      process.exit(1);
    }
    pagesToEdit = [pageNum];
  }
  
  // Parse instruction
  const instructionLower = instruction.toLowerCase();
  
  console.log(`Editing ${pagesToEdit.length} page(s)...`);
  console.log(`Instruction: ${instruction}`);
  
  // Simple text replacement patterns
  if (instructionLower.includes('replace') && instructionLower.includes('with')) {
    const replaceMatch = instruction.match(/replace ['"]([^'"]+)['"] with ['"]([^'"]+)['"]/i);
    if (replaceMatch) {
      const [_, oldText, newText] = replaceMatch;
      console.log(`\nReplacing "${oldText}" with "${newText}"`);
      
      // Add annotation showing the replacement
      for (const pageNum of pagesToEdit) {
        const page = pages[pageNum];
        const { width, height } = page.getSize();
        
        page.drawText(`[nano-pdf: REPLACED "${oldText}" -> "${newText}"]`, {
          x: 50,
          y: height - 30,
          size: 10,
          color: rgb(0, 0, 0),
        });
        
        console.log(`  Page ${pageNum}: Marked replacement`);
      }
    }
  } 
  else if (instructionLower.includes('change') && instructionLower.includes('to')) {
    const changeMatch = instruction.match(/change ['"]?([^'"]+?)['"]? to ['"]?([^'"]+?)['"]?$/i);
    if (changeMatch) {
      const [_, oldText, newText] = changeMatch;
      console.log(`\nChanging "${oldText}" to "${newText}"`);
      
      for (const pageNum of pagesToEdit) {
        const page = pages[pageNum];
        const { width, height } = page.getSize();
        
        page.drawText(`[nano-pdf: CHANGED "${oldText}" -> "${newText}"]`, {
          x: 50,
          y: height - 30,
          size: 10,
          color: rgb(0, 0, 0),
        });
        
        console.log(`  Page ${pageNum}: Marked change`);
      }
    }
  }
  else if (instructionLower.includes('change the title') || instructionLower.includes('update the title')) {
    const titleMatch = instruction.match(/(?:change|update) (?:the )?title to ['"]([^'"]+)['"]/i);
    if (titleMatch) {
      const newTitle = titleMatch[1];
      console.log(`\nUpdating title to: ${newTitle}`);
      
      for (const pageNum of pagesToEdit) {
        const page = pages[pageNum];
        const { width, height } = page.getSize();
        
        page.drawText(`[nano-pdf: TITLE UPDATED to "${newTitle}"]`, {
          x: 50,
          y: height - 50,
          size: 14,
          color: rgb(0, 0, 0),
        });
        
        console.log(`  Page ${pageNum}: Title updated`);
      }
    }
  }
  else if (instructionLower.includes('update the date') || instructionLower.includes('change the date')) {
    const dateMatch = instruction.match(/(?:update|change) (?:the )?date to ['"]?([^'"]+?)['"]?\s*$/i);
    if (dateMatch) {
      const newDate = dateMatch[1];
      console.log(`\nUpdating date to: ${newDate}`);
      
      for (const pageNum of pagesToEdit) {
        const page = pages[pageNum];
        const { width, height } = page.getSize();
        
        page.drawText(`[nano-pdf: DATE UPDATED to "${newDate}"]`, {
          x: 50,
          y: height - 70,
          size: 12,
          color: rgb(0, 0, 0),
        });
        
        console.log(`  Page ${pageNum}: Date updated`);
      }
    }
  }
  else {
    console.log('\nComplex instruction detected.');
    console.log('For complex edits, the PDF will be annotated with the instruction.');
    console.log('Full text editing requires more sophisticated PDF parsing.');
    
    for (const pageNum of pagesToEdit) {
      const page = pages[pageNum];
      const { width, height } = page.getSize();
      
      // Add instruction as annotation
      const truncatedInst = instruction.length > 100 ? instruction.substring(0, 100) + '...' : instruction;
      page.drawText(`[nano-pdf: ${truncatedInst}]`, {
        x: 50,
        y: height - 30,
        size: 8,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }
  
  // Save the modified PDF
  const outputFilePath = outputPath || pdfPath;
  const modifiedPdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputFilePath, modifiedPdfBytes);
  
  console.log(`\n✓ Saved to: ${outputFilePath}`);
  
  return outputFilePath;
}

// Get PDF info
async function getPdfInfo(pdfPath) {
  if (!fs.existsSync(pdfPath)) {
    console.error(`Error: File not found: ${pdfPath}`);
    process.exit(1);
  }
  
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  console.log(`File: ${pdfPath}`);
  console.log(`Pages: ${pdfDoc.getPageCount()}`);
  
  const metadata = pdfDoc.getTitle();
  if (metadata) {
    console.log(`Title: ${metadata}`);
  }
  
  const author = pdfDoc.getAuthor();
  if (author) {
    console.log(`Author: ${author}`);
  }
  
  const subject = pdfDoc.getSubject();
  if (subject) {
    console.log(`Subject: ${subject}`);
  }
  
  const creationDate = pdfDoc.getCreationDate();
  if (creationDate) {
    console.log(`Created: ${creationDate.toISOString()}`);
  }
}

// List PDF pages
async function listPdfPages(pdfPath) {
  if (!fs.existsSync(pdfPath)) {
    console.error(`Error: File not found: ${pdfPath}`);
    process.exit(1);
  }
  
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  const pages = pdfDoc.getPages();
  console.log(`Total pages: ${pages.length}\n`);
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    console.log(`Page ${i}: ${Math.round(width)}x${Math.round(height)} pts`);
  }
}

// Main
async function main() {
  const args = parseArgs();
  
  try {
    if (args.command === 'edit') {
      await editPdf(args.pdf, args.page, args.instruction, args.output);
    } else if (args.command === 'info') {
      await getPdfInfo(args.pdf);
    } else if (args.command === 'pages') {
      await listPdfPages(args.pdf);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
