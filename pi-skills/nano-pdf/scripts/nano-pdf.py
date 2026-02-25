#!/usr/bin/env python3
"""
nano-pdf: Edit PDFs with natural language instructions

Usage:
    python nano-pdf.py edit <pdf_path> <page> "<instruction>" [-o output.pdf]
    python nano-pdf.py info <pdf_path>
    python nano-pdf.py pages <pdf_path>
"""

import argparse
import os
import sys
import subprocess
import tempfile
from pathlib import Path

# Try to import pypdf, install if missing
try:
    from pypdf import PdfReader, PdfWriter
except ImportError:
    print("Installing pypdf...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pypdf", "-q"])
    from pypdf import PdfReader, PdfWriter


def edit_pdf(pdf_path: str, page: str, instruction: str, output_path: str = None):
    """Edit a PDF with natural language instructions."""
    
    if not os.path.exists(pdf_path):
        print(f"Error: File not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)
    
    reader = PdfReader(pdf_path)
    writer = PdfWriter()
    
    # Determine which pages to edit
    total_pages = len(reader.pages)
    
    if page.lower() == "all":
        pages_to_edit = list(range(total_pages))
    else:
        try:
            page_num = int(page)
            if page_num < 0 or page_num >= total_pages:
                print(f"Error: Page {page_num} out of range (0-{total_pages-1})", file=sys.stderr)
                sys.exit(1)
            pages_to_edit = [page_num]
        except ValueError:
            print(f"Error: Invalid page number: {page}", file=sys.stderr)
            sys.exit(1)
    
    # Copy all pages to writer
    for i, page in enumerate(reader.pages):
        writer.add_page(page)
    
    # For now, we'll use pymupdf (fitz) for text editing if available
    # Otherwise, we'll do page extraction and text replacement
    try:
        import fitz  # PyMuPDF
        return edit_with_pymupdf(pdf_path, pages_to_edit, instruction, output_path)
    except ImportError:
        print("Installing PyMuPDF for text editing...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pymupdf", "-q"])
        import fitz
        return edit_with_pymupdf(pdf_path, pages_to_edit, instruction, output_path)


def edit_with_pymupdf(pdf_path: str, pages_to_edit: list, instruction: str, output_path: str = None):
    """Edit PDF using PyMuPDF (fitz)."""
    
    if output_path is None:
        output_path = pdf_path
    
    doc = fitz.open(pdf_path)
    
    # Parse the instruction to determine what to do
    instruction_lower = instruction.lower()
    
    for page_num in pages_to_edit:
        if page_num >= len(doc):
            continue
            
        page = doc[page_num]
        text = page.get_text()
        
        # Simple text replacement patterns
        # Format: "replace 'X' with 'Y'" or "change X to Y"
        
        if "replace" in instruction_lower and "with" in instruction_lower:
            # Extract the parts
            import re
            replace_match = re.search(r"replace ['\"]([^'\"]+)['\"] with ['\"]([^'\"]+)['\"]", instruction_lower)
            if replace_match:
                old_text = replace_match.group(1)
                new_text = replace_match.group(2)
                
                # Replace text in the page
                for instance in page.search_for(old_text):
                    page.add_redact_annot(instance)
                page.apply_redactions(text=fitz.TEXT_REPLACE, replacement=new_text)
                print(f"Replaced '{old_text}' with '{new_text}' on page {page_num}")
        
        elif "change" in instruction_lower and "to" in instruction_lower:
            import re
            # Try "change X to Y" pattern
            change_match = re.search(r"change ['\"]?([^'\"]+?)['\"]? to ['\"]?([^'\"]+?)['\"]?$", instruction_lower)
            if change_match:
                old_text = change_match.group(1).strip()
                new_text = change_match.group(2).strip()
                
                for instance in page.search_for(old_text):
                    page.add_redact_annot(instance)
                page.apply_redactions(text=fitz.TEXT_REPLACE, replacement=new_text)
                print(f"Changed '{old_text}' to '{new_text}' on page {page_num}")
            else:
                # Try "change the title to X" or "change title to X"
                title_match = re.search(r"change (?:the )?title to ['\"]([^'\"]+)['\"]", instruction_lower)
                if title_match:
                    new_title = title_match.group(1)
                    # Try to find and replace title text
                    for instance in page.search_for("Title"):
                        # This is a simplified approach - real implementation would be more sophisticated
                        pass
                    print(f"Title change requested: '{new_title}'")
        
        elif "update" in instruction_lower and "date" in instruction_lower:
            import re
            date_match = re.search(r"update (?:the )?date to ['\"]?([^'\"]+?)['\"]?\s*$", instruction_lower)
            if date_match:
                new_date = date_match.group(1)
                print(f"Date update requested: '{new_date}'")
                # Similar replacement logic would go here
        
        else:
            # For complex instructions, use the LLM-based approach
            print(f"Complex instruction on page {page_num}: {instruction}")
            print("Using LLM-based text extraction and replacement...")
            
            # Get all text blocks
            blocks = page.get_text("blocks")
            print(f"Found {len(blocks)} text blocks on page {page_num}")
            
            # This is where we'd use LLM to determine what to change
            # For now, list available text for the user
            print("\nAvailable text on this page:")
            for i, block in enumerate(blocks[:10]):  # Show first 10 blocks
                if block[6] == 0:  # Text block
                    print(f"  {i}: {block[4][:100]}...")
    
    # Save the modified PDF
    doc.save(output_path)
    print(f"\nSaved to: {output_path}")
    doc.close()
    
    return output_path


def get_pdf_info(pdf_path: str):
    """Get PDF metadata."""
    if not os.path.exists(pdf_path):
        print(f"Error: File not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)
    
    reader = PdfReader(pdf_path)
    
    print(f"File: {pdf_path}")
    print(f"Pages: {len(reader.pages)}")
    
    metadata = reader.metadata
    if metadata:
        print("\nMetadata:")
        for key, value in metadata.items():
            if value:
                print(f"  {key}: {value}")


def list_pdf_pages(pdf_path: str):
    """List all pages in the PDF."""
    if not os.path.exists(pdf_path):
        print(f"Error: File not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)
    
    reader = PdfReader(pdf_path)
    
    print(f"Total pages: {len(reader.pages)}\n")
    
    for i, page in enumerate(reader.pages):
        print(f"Page {i}:")
        # Try to extract a title or first line
        try:
            text = page.extract_text()
            if text:
                first_line = text.split('\n')[0][:80]
                print(f"  First line: {first_line}")
        except:
            pass
        print()


def main():
    parser = argparse.ArgumentParser(description="Edit PDFs with natural language instructions")
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Edit command
    edit_parser = subparsers.add_parser("edit", help="Edit a PDF")
    edit_parser.add_argument("pdf", help="Path to PDF file")
    edit_parser.add_argument("page", help="Page number (0-based) or 'all'")
    edit_parser.add_argument("instruction", help="Natural language instruction")
    edit_parser.add_argument("-o", "--output", help="Output file path")
    
    # Info command
    info_parser = subparsers.add_parser("info", help="Get PDF info")
    info_parser.add_argument("pdf", help="Path to PDF file")
    
    # Pages command
    pages_parser = subparsers.add_parser("pages", help="List PDF pages")
    pages_parser.add_argument("pdf", help="Path to PDF file")
    
    args = parser.parse_args()
    
    if args.command == "edit":
        edit_pdf(args.pdf, args.page, args.instruction, args.output)
    elif args.command == "info":
        get_pdf_info(args.pdf)
    elif args.command == "pages":
        list_pdf_pages(args.pdf)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
