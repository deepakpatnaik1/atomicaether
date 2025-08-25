#!/usr/bin/env python3
"""
Script to identify hardcoded CSS values in Svelte files.
Ignores CSS variables (var(--*)) which are already externalized.
"""

import re
import os
import json
from pathlib import Path
from typing import Dict, List, Tuple

# CSS property patterns to look for
CSS_PATTERNS = {
    # Colors (but not CSS variables)
    'colors': r'(?:color|background|background-color|border-color|outline-color|box-shadow|text-shadow|fill|stroke)\s*:\s*([^;]+?)(?:;|$)',
    
    # Spacing values
    'spacing': r'(?:padding|margin|gap|top|right|bottom|left|inset)\s*:\s*([^;]+?)(?:;|$)',
    
    # Dimensions
    'dimensions': r'(?:width|height|min-width|max-width|min-height|max-height)\s*:\s*([^;]+?)(?:;|$)',
    
    # Typography
    'typography': r'(?:font-size|font-weight|font-family|line-height|letter-spacing|text-transform)\s*:\s*([^;]+?)(?:;|$)',
    
    # Borders and radius
    'borders': r'(?:border|border-width|border-radius|outline)\s*:\s*([^;]+?)(?:;|$)',
    
    # Layout
    'layout': r'(?:display|position|z-index|overflow|flex|grid-template|align-items|justify-content)\s*:\s*([^;]+?)(?:;|$)',
    
    # Effects
    'effects': r'(?:opacity|transform|transition|animation|backdrop-filter|-webkit-backdrop-filter|filter)\s*:\s*([^;]+?)(?:;|$)',
}

def extract_styles_from_file(file_path: str) -> Dict[str, List[Tuple[int, str, str]]]:
    """
    Extract hardcoded styles from a Svelte file.
    Returns a dictionary categorized by style type.
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all <style> blocks
    style_blocks = re.findall(r'<style[^>]*>(.*?)</style>', content, re.DOTALL)
    
    results = {category: [] for category in CSS_PATTERNS.keys()}
    
    for style_block in style_blocks:
        lines = style_block.split('\n')
        for line_num, line in enumerate(lines, 1):
            # Skip lines with CSS variables (already externalized)
            if 'var(--' in line:
                continue
            
            # Skip comments
            if line.strip().startswith('/*') or line.strip().startswith('//'):
                continue
                
            for category, pattern in CSS_PATTERNS.items():
                matches = re.finditer(pattern, line, re.IGNORECASE)
                for match in matches:
                    value = match.group(1).strip()
                    # Skip if value is a CSS variable
                    if not value.startswith('var(--'):
                        # Get the full property declaration
                        full_match = match.group(0).strip()
                        results[category].append((line_num, full_match, value))
    
    return results

def analyze_svelte_files(file_paths: List[str]) -> Dict[str, Dict]:
    """
    Analyze multiple Svelte files for hardcoded styles.
    """
    all_results = {}
    
    for file_path in file_paths:
        if os.path.exists(file_path):
            print(f"\n📁 Analyzing: {file_path}")
            results = extract_styles_from_file(file_path)
            
            # Only include files with hardcoded values
            has_hardcoded = any(len(values) > 0 for values in results.values())
            if has_hardcoded:
                all_results[file_path] = results
                
                # Print summary for this file
                for category, values in results.items():
                    if values:
                        print(f"  {category}: {len(values)} hardcoded values")
                        for line_num, full_match, value in values[:3]:  # Show first 3 examples
                            print(f"    Line {line_num}: {full_match}")
                        if len(values) > 3:
                            print(f"    ... and {len(values) - 3} more")
    
    return all_results

def save_results(results: Dict, output_file: str):
    """
    Save results to a JSON file for further analysis.
    """
    # Convert to serializable format
    output = {}
    for file_path, categories in results.items():
        output[file_path] = {}
        for category, values in categories.items():
            if values:
                output[file_path][category] = [
                    {
                        'line': line_num,
                        'declaration': full_match,
                        'value': value
                    }
                    for line_num, full_match, value in values
                ]
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)
    
    print(f"\n✅ Results saved to: {output_file}")

def main():
    # Files to analyze
    svelte_files = [
        "/Users/d.patnaik/code/atomicaether/apps/web/src/routes/+page.svelte",
        "/Users/d.patnaik/code/atomicaether/apps/web/src/routes/recyclebin/+page.svelte",
        "/Users/d.patnaik/code/atomicaether/apps/web/src/lib/bricks/InputBarUI/core/InputBarUI.svelte",
        "/Users/d.patnaik/code/atomicaether/apps/web/src/lib/bricks/MessageScrollback/core/MessageScrollback.svelte",
        "/Users/d.patnaik/code/atomicaether/apps/web/src/lib/bricks/MessageScrollback/core/MarkdownRenderer.svelte",
        "/Users/d.patnaik/code/atomicaether/apps/web/src/lib/bricks/RecycleBinScrollback/core/RecycleBinScrollback.svelte",
        "/Users/d.patnaik/code/atomicaether/apps/web/src/lib/components/ThemePickerUI/ThemePickerUI.svelte",
    ]
    
    print("🔍 Identifying Hardcoded CSS Values in Svelte Files")
    print("=" * 50)
    
    results = analyze_svelte_files(svelte_files)
    
    # Save results
    output_file = "/Users/d.patnaik/code/atomicaether/hardcoded_styles_analysis.json"
    save_results(results, output_file)
    
    # Print summary
    print("\n📊 Summary:")
    total_hardcoded = 0
    for file_path, categories in results.items():
        file_total = sum(len(values) for values in categories.values())
        total_hardcoded += file_total
        print(f"  {os.path.basename(file_path)}: {file_total} hardcoded values")
    
    print(f"\n🎯 Total hardcoded values found: {total_hardcoded}")

if __name__ == "__main__":
    main()