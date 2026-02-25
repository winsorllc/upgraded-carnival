#!/usr/bin/env python3
"""
Edit PDF files using nano-pdf CLI or direct PyPDF2/pdfplumber operations.

Usage:
    python edit_pdf.py --input input.pdf --page 1 --instruction "Change title to 'Q3 Results'"
    python edit_pdf.py --input input.pdf --merge file2.pdf --output merged.pdf
    python edit_pdf.py --input input.pdf --split --output-dir ./pages/
"""

import argparse
import subprocess
import sys
from pathlib import Path


def check_nano_pdf_installed():
    """Check if nano-pdf CLI is available."""
    try:
        result = subprocess.run(['nano-pdf', '--version'], 
                                capture_output=True, text=True, timeout=5)
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def edit_with_nanopdf(input_path: str, page: int, instruction: str, output_path: str):
    """Use nano-pdf CLI to edit a PDF page."""
    cmd = [
        'nano-pdf', 'edit',
        input_path,
        str(page),
        instruction,
        '--output', output_path
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            print(f"nano-pdf error: {result.stderr}", file=sys.stderr)
            return False
        print(f"Successfully edited page {page} of {input_path}")
        print(f"Output saved to: {output_path}")
        return True
    except subprocess.TimeoutExpired:
        print("Error: nano-pdf operation timed out", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error running nano-pdf: {e}", file=sys.stderr)
        return False


def merge_pdfs(input_files: list, output_path: str):
    """Merge multiple PDFs using PyPDF2."""
    try:
        from PyPDF2 import PdfMerger
        
        merger = PdfMerger()
        for pdf_file in input_files:
            if Path(pdf_file).exists():
                merger.append(pdf_file)
                print(f"Added: {pdf_file}")
            else:
                print(f"Warning: File not found: {pdf_file}", file=sys.stderr)
        
        merger.write(output_path)
        merger.close()
        print(f"Successfully merged {len(input_files)} files into: {output_path}")
        return True
    except ImportError:
        print("Error: PyPDF2 not installed. Run: pip install PyPDF2", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error merging PDFs: {e}", file=sys.stderr)
        return False


def split_pdf(input_path: str, output_dir: str):
    """Split PDF into individual pages."""
    try:
        from PyPDF2 import PdfReader, PdfWriter
        
        reader = PdfReader(input_path)
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        
        for i, page in enumerate(reader.pages):
            writer = PdfWriter()
            writer.add_page(page)
            output_file = Path(output_dir) / f"page_{i+1:03d}.pdf"
            
            with open(output_file, 'wb') as f:
                writer.write(f)
        
        print(f"Successfully split {len(reader.pages)} pages to: {output_dir}/")
        return True
    except ImportError:
        print("Error: PyPDF2 not installed. Run: pip install PyPDF2", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error splitting PDF: {e}", file=sys.stderr)
        return False


def extract_pages(input_path: str, pages: str, output_path: str):
    """Extract specific pages from a PDF."""
    try:
        from PyPDF2 import PdfReader, PdfWriter
        
        reader = PdfReader(input_path)
        writer = PdfWriter()
        
        # Parse page ranges (e.g., "1-5,7,9-10")
        page_nums = []
        for part in pages.split(','):
            if '-' in part:
                start, end = map(int, part.split('-'))
                page_nums.extend(range(start - 1, end))  # Convert to 0-based
            else:
                page_nums.append(int(part) - 1)  # Convert to 0-based
        
        for i in page_nums:
            if 0 <= i < len(reader.pages):
                writer.add_page(reader.pages[i])
        
        with open(output_path, 'wb') as f:
            writer.write(f)
        
        print(f"Extracted pages {pages} from {input_path} to {output_path}")
        return True
    except Exception as e:
        print(f"Error extracting pages: {e}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(description="Edit and manipulate PDF files")
    parser.add_argument("--input", "-i", required=True, help="Input PDF file")
    parser.add_argument("--output", "-o", help="Output PDF file")
    parser.add_argument("--page", "-p", type=int, help="Page number to edit (1-based)")
    parser.add_argument("--instruction", "-s", help="Edit instruction (natural language)")
    parser.add_argument("--merge", "-m", nargs='+', help="Merge with other PDF files")
    parser.add_argument("--split", action="store_true", help="Split PDF into pages")
    parser.add_argument("--output-dir", "-d", help="Output directory for split")
    parser.add_argument("--extract", "-e", help="Extract pages (e.g., '1-5,7,9-10')")
    
    args = parser.parse_args()
    
    # Check if input file exists
    if not Path(args.input).exists():
        print(f"Error: Input file not found: {args.input}", file=sys.stderr)
        sys.exit(1)
    
    success = False
    
    # Handle merge operation
    if args.merge:
        output = args.output or "merged.pdf"
        all_files = [args.input] + args.merge
        success = merge_pdfs(all_files, output)
    
    # Handle split operation
    elif args.split:
        output_dir = args.output_dir or "./pages/"
        success = split_pdf(args.input, output_dir)
    
    # Handle page extraction
    elif args.extract:
        output = args.output or "extracted.pdf"
        success = extract_pages(args.input, args.extract, output)
    
    # Handle edit operation
    elif args.page and args.instruction:
        if check_nano_pdf_installed():
            output = args.output or f"edited_{Path(args.input).name}"
            success = edit_with_nanopdf(args.input, args.page, args.instruction, output)
        else:
            print("nano-pdf CLI not found. For simple edits, use a PDF editor.", file=sys.stderr)
            print("Install with: pip install nano-pdf", file=sys.stderr)
            sys.exit(1)
    
    else:
        parser.print_help()
        sys.exit(1)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
