#!/usr/bin/env python3
"""
Hardcode Finder (hc.py) - Fixed Version
Detects hardcoded values while ignoring legitimate fallback patterns.
"""

import re
import sys
import os
from pathlib import Path
from typing import List, Tuple, Dict

class HardcodeFinder:
    def __init__(self):
        # Patterns for detecting hardcoded values
        self.hardcode_patterns = [
            # Model/Theme/Persona hardcoded mappings in return statements
            (r"if\s*\([^)]*===\s*['\"]([^'\"]+)['\"][^)]*\)\s*return\s*['\"]([^'\"]+)['\"]", 'hardcoded_mapping'),
            
            # CSS media query breakpoints
            (r'@media[^{]*\(\s*(?:min-|max-)?width:\s*(\d+px)\s*\)', 'media_breakpoint'),
            (r'min-width:\s*(\d+px)', 'breakpoint'),
            
            # CSS width values
            (r'width:\s*(\d+px)(?:\s*!important)?', 'css_width'),
            (r'calc\(\([^)]+\s*-\s*(\d+px)\s*\)[^)]*\)', 'calc_width'),
            
            # CSS color values
            (r'color:\s*(rgba?\([^)]+\))', 'css_color'),
            (r'color:\s*(#[0-9a-fA-F]{3,8})', 'hex_color'),
            (r'background:\s*(rgba?\([^)]+\))', 'bg_color'),
            
            # String literals in assignment/return (but not imports)
            (r"return\s+['\"]([^'\"]{3,})['\"]", 'return_string'),
            (r"=\s*['\"]([^'\"]{3,})['\"](?!\s*;?\s*$)", 'assignment_string'),
            
            # Z-index values
            (r'z-index:\s*(\d+)', 'z_index'),
            
            # Large numeric values (likely hardcoded)
            (r'\b((?:2[0-9][0-9]|[3-9][0-9][0-9]|\d{4,}))\b', 'large_number'),
        ]
    
    def analyze_file(self, file_path: str) -> List[Tuple[int, str, str, str]]:
        """
        Analyze a file for hardcoded values.
        Returns list of (line_number, line_content, match_type, matched_value)
        """
        results = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
        except (UnicodeDecodeError, IOError):
            return results
        
        for line_num, line in enumerate(lines, 1):
            line_content = line.strip()
            if not line_content:
                continue
            
            # Skip comment lines
            if line_content.startswith(('/*', '//', '<!--', '#', '*')):
                continue
                
            # Skip import statements
            if line_content.strip().startswith(('import ', 'from ')):
                continue
            
            # Check each hardcode pattern
            for pattern, match_type in self.hardcode_patterns:
                matches = re.finditer(pattern, line, re.IGNORECASE)
                
                for match in matches:
                    if match_type == 'hardcoded_mapping':
                        # For mappings, show both the key and value
                        key_val = f"{match.group(1)} → {match.group(2)}"
                        matched_value = key_val
                    else:
                        # Use first capturing group if available, otherwise full match
                        matched_value = match.group(1) if match.groups() else match.group(0)
                    
                    # Additional filtering
                    if self.should_ignore_match(matched_value, match_type, line_content):
                        continue
                    
                    results.append((line_num, line_content, match_type, matched_value))
        
        return results
    
    def should_ignore_match(self, value: str, match_type: str, line_content: str) -> bool:
        """Filter out non-problematic matches."""
        
        # Ignore OR/null coalescing fallbacks
        if '||' in line_content or '??' in line_content:
            return True
            
        # Ignore CSS var() fallbacks
        if 'var(' in line_content and ',' in line_content:
            return True
        
        # Ignore very common safe values
        safe_values = {'0px', '1px', '100%', 'auto', 'none', 'hidden', 'visible', 'transparent'}
        if value in safe_values:
            return True
        
        # Ignore font weights (100, 200, 300, etc.)
        if match_type == 'large_number' and value in ['100', '200', '300', '400', '500', '600', '700', '800', '900']:
            return True
        
        # Ignore single character strings
        if match_type in ['return_string', 'assignment_string'] and len(value) <= 1:
            return True
        
        return False
    
    def scan_files(self, file_paths: List[str]) -> Dict[str, List[Tuple[int, str, str, str]]]:
        """Scan multiple files and return organized results."""
        results = {}
        
        for file_path in file_paths:
            if os.path.isfile(file_path):
                file_results = self.analyze_file(file_path)
                if file_results:
                    results[file_path] = file_results
        
        return results
    
    def print_results(self, results: Dict[str, List[Tuple[int, str, str, str]]]):
        """Print results in a readable format."""
        if not results:
            print("✅ No hardcoded values detected!")
            return
        
        total_issues = sum(len(issues) for issues in results.values())
        print(f"🚨 Found {total_issues} hardcoded values in {len(results)} files:")
        print()
        
        for file_path, issues in results.items():
            print(f"📄 {file_path}")
            print(f"   {len(issues)} issues found:")
            
            for line_num, line_content, match_type, matched_value in issues:
                print(f"   Line {line_num:3d} [{match_type:15s}] {matched_value}")
                print(f"        → {line_content[:100]}{'...' if len(line_content) > 100 else ''}")
            print()

def main():
    if len(sys.argv) < 2:
        print("Usage: python hc.py <file1> [file2] [file3] ...")
        print("   or: python hc.py <directory>")
        sys.exit(1)
    
    finder = HardcodeFinder()
    file_paths = []
    
    for arg in sys.argv[1:]:
        if os.path.isdir(arg):
            # Recursively find relevant files in directory
            for ext in ['*.ts', '*.js', '*.svelte', '*.css', '*.json']:
                file_paths.extend(Path(arg).rglob(ext))
        else:
            file_paths.append(arg)
    
    file_paths = [str(p) for p in file_paths]
    results = finder.scan_files(file_paths)
    finder.print_results(results)

if __name__ == "__main__":
    main()