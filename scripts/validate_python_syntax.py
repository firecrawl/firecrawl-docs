#!/usr/bin/env python3
"""
Validate Python syntax in markdown documentation files.

This script extracts Python code blocks from MDX/markdown files and verifies
they are syntactically valid. Run this before submitting PRs to catch Python
syntax errors in documentation examples.

Usage:
    python3 scripts/validate_python_syntax.py [file_or_directory]

Examples:
    python3 scripts/validate_python_syntax.py

    python3 scripts/validate_python_syntax.py advanced-scraping-guide.mdx

    python3 scripts/validate_python_syntax.py snippets/
"""
import re
import ast
import sys
from pathlib import Path
from typing import List, Tuple

def extract_python_blocks(content: str) -> List[str]:
    """Extract Python code blocks from markdown content."""
    pattern = r'```python.*?\n(.*?)```'
    matches = re.findall(pattern, content, re.DOTALL)
    return matches

def validate_python_code(code: str) -> Tuple[bool, str]:
    """Check if Python code is syntactically valid."""
    try:
        ast.parse(code)
        return True, ""
    except SyntaxError as e:
        return False, str(e)

def find_python_files(path: Path) -> List[Path]:
    """Find all MDX and markdown files that might contain Python code."""
    if path.is_file():
        return [path]
    
    patterns = ['**/*.mdx', '**/*.md']
    files = []
    for pattern in patterns:
        files.extend(path.glob(pattern))
    return sorted(set(files))

def main(target_path: str = None):
    """Validate Python syntax in documentation files."""
    if target_path:
        base_path = Path(target_path)
        if not base_path.exists():
            print(f"❌ Path not found: {target_path}")
            return 1
    else:
        base_path = Path.cwd()
    
    files = find_python_files(base_path)
    
    if not files:
        print(f"⚠️  No markdown/MDX files found in {base_path}")
        return 1
    
    all_valid = True
    total_blocks = 0
    files_with_python = 0
    
    for filepath in files:
        try:
            content = filepath.read_text()
        except Exception as e:
            print(f"❌ Error reading {filepath}: {e}")
            continue
            
        blocks = extract_python_blocks(content)
        
        if not blocks:
            continue
        
        files_with_python += 1
        print(f"\n📄 {filepath.relative_to(base_path if base_path.is_dir() else base_path.parent)}")
        
        for i, block in enumerate(blocks, 1):
            total_blocks += 1
            is_valid, error = validate_python_code(block)
            if is_valid:
                print(f"  ✅ Block {i}: Valid Python syntax")
            else:
                print(f"  ❌ Block {i}: Invalid Python syntax")
                print(f"     Error: {error}")
                print(f"     Code preview:\n{block[:200]}...")
                all_valid = False
    
    print(f"\n{'='*60}")
    print(f"Files checked: {len(files)}")
    print(f"Files with Python blocks: {files_with_python}")
    print(f"Total Python blocks validated: {total_blocks}")
    
    if total_blocks == 0:
        print("⚠️  No Python code blocks found")
        return 0
    
    if all_valid:
        print("✅ All Python code blocks are syntactically valid!")
        return 0
    else:
        print("❌ Some Python code blocks have syntax errors!")
        return 1

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    sys.exit(main(target))
