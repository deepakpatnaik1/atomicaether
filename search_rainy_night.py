#!/usr/bin/env python3

import os
import re
from pathlib import Path

def search_rainy_night_references(root_dir):
    """Search for all references to rainy-night.json in the codebase, excluding documentation files."""
    
    # File extensions to exclude
    exclude_extensions = {'.md', '.txt', '.rst', '.doc', '.docx', '.py', '.json'}
    
    # Directories to exclude
    exclude_dirs = {'node_modules', '.git', 'dist', 'build', '__pycache__'}
    
    results = []
    
    for root, dirs, files in os.walk(root_dir):
        # Remove excluded directories from dirs list to avoid traversing them
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for file in files:
            file_path = Path(root) / file
            
            # Skip documentation files
            if file_path.suffix.lower() in exclude_extensions:
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    
                # Search for rainy-night.json references (case insensitive)
                if re.search(r'rainy-night\.json', content, re.IGNORECASE):
                    # Find line numbers where it appears
                    lines = content.split('\n')
                    matches = []
                    for i, line in enumerate(lines, 1):
                        if re.search(r'rainy-night\.json', line, re.IGNORECASE):
                            matches.append((i, line.strip()))
                    
                    results.append({
                        'file': str(file_path.relative_to(root_dir)),
                        'matches': matches
                    })
                    
            except Exception as e:
                # Skip files that can't be read
                continue
    
    return results

if __name__ == "__main__":
    root_directory = "."
    references = search_rainy_night_references(root_directory)
    
    if references:
        print(f"Found {len(references)} files with references to 'rainy-night.json':\n")
        
        for ref in references:
            print(f"File: {ref['file']}")
            for line_num, line_content in ref['matches']:
                print(f"  Line {line_num}: {line_content}")
            print()
    else:
        print("No references to 'rainy-night.json' found in the codebase.")