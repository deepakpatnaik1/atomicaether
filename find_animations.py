#!/usr/bin/env python3
"""
Find all CSS animations, transitions, and easing functions in the codebase
"""

import os
import re
from pathlib import Path
import json

# Patterns to search for
PATTERNS = [
    # CSS transition properties
    r'transition\s*:\s*[^;}\n]+',
    r'transition-[a-z-]+\s*:\s*[^;}\n]+',
    
    # CSS animation properties  
    r'animation\s*:\s*[^;}\n]+',
    r'animation-[a-z-]+\s*:\s*[^;}\n]+',
    r'@keyframes\s+[\w-]+\s*\{[^}]*\}',
    
    # Easing functions
    r'ease(?:-in|-out|-in-out)?(?:\s|;|,|\))',
    r'cubic-bezier\s*\([^)]+\)',
    r'linear(?:\s|;|,|\))',
    r'steps\s*\([^)]+\)',
    
    # Transform transitions
    r'transform\s*:\s*[^;}\n]+',
    
    # Opacity transitions (often used for fades)
    r'opacity\s*:\s*[\d.]+\s*[;}\n]',
    
    # CSS variables that might contain transitions
    r'--[\w-]*(?:transition|animation|ease|duration|delay)[\w-]*\s*:\s*[^;}\n]+',
    
    # Svelte/JS transition directives
    r'transition:[\w]+',
    r'in:[\w]+',
    r'out:[\w]+',
    r'animate:[\w]+',
    
    # Will-change property (optimization for animations)
    r'will-change\s*:\s*[^;}\n]+',
]

def find_animations(root_dir):
    """Find all animation/transition related code in the project"""
    
    findings = []
    
    # File extensions to search
    extensions = ['.css', '.scss', '.svelte', '.ts', '.js', '.jsx', '.tsx', '.html']
    
    # Directories to skip
    skip_dirs = {'node_modules', '.git', 'dist', 'build', '.svelte-kit'}
    
    for path in Path(root_dir).rglob('*'):
        # Skip directories
        if path.is_dir():
            continue
            
        # Skip if in excluded directory
        if any(skip_dir in path.parts for skip_dir in skip_dirs):
            continue
            
        # Check file extension
        if path.suffix not in extensions:
            continue
            
        try:
            content = path.read_text(encoding='utf-8')
            
            # Find all matches
            for pattern in PATTERNS:
                matches = re.finditer(pattern, content, re.IGNORECASE | re.MULTILINE | re.DOTALL)
                for match in matches:
                    # Get line number
                    line_num = content[:match.start()].count('\n') + 1
                    
                    # Get the line content for context
                    lines = content.split('\n')
                    line_content = lines[line_num - 1] if line_num <= len(lines) else ''
                    
                    findings.append({
                        'file': str(path.relative_to(root_dir)),
                        'line': line_num,
                        'pattern': pattern,
                        'match': match.group(0)[:100],  # Truncate long matches
                        'line_content': line_content.strip()[:150]  # Truncate long lines
                    })
                    
        except Exception as e:
            print(f"Error reading {path}: {e}")
    
    return findings

def main():
    root_dir = '/Users/d.patnaik/code/atomicaether'
    
    print("Searching for animations, transitions, and easing functions...")
    print("=" * 80)
    
    findings = find_animations(root_dir)
    
    # Group by file
    files_with_animations = {}
    for finding in findings:
        file_path = finding['file']
        if file_path not in files_with_animations:
            files_with_animations[file_path] = []
        files_with_animations[file_path].append(finding)
    
    # Print summary
    print(f"\nFound {len(findings)} animation/transition instances in {len(files_with_animations)} files\n")
    
    # Print detailed findings
    for file_path, file_findings in sorted(files_with_animations.items()):
        print(f"\n📁 {file_path}")
        print("-" * 40)
        
        # Sort by line number
        for finding in sorted(file_findings, key=lambda x: x['line']):
            print(f"  Line {finding['line']}: {finding['match']}")
    
    # Save to JSON for processing
    with open('/Users/d.patnaik/code/atomicaether/animation_findings.json', 'w') as f:
        json.dump(files_with_animations, f, indent=2)
    
    print(f"\n✅ Results saved to animation_findings.json")
    print(f"\nTotal files to modify: {len(files_with_animations)}")

if __name__ == '__main__':
    main()