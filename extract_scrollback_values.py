#!/usr/bin/env python3
"""
Extraction script for MessageScrollback hardcoded values
Identifies all values that should move to rainy-night theme
"""

import re
import json
from pathlib import Path
from typing import Dict, List, Tuple

def extract_hardcoded_values():
    """Extract all hardcoded values from MessageScrollback component"""
    
    scrollback_file = Path("apps/web/src/lib/components/MessageScrollback/MessageScrollback.svelte")
    if not scrollback_file.exists():
        print(f"❌ MessageScrollback not found at {scrollback_file}")
        return None
    
    content = scrollback_file.read_text()
    
    # Patterns for different types of hardcoded values
    patterns = {
        'css_dimensions': r'(\d+(?:\.\d+)?)(px|em|rem|vh|vw|%)\b',
        'css_colors_hex': r'#([0-9a-fA-F]{3,8})\b',
        'css_colors_rgba': r'rgba?\(([^)]+)\)',
        'css_numbers': r'\b(\d+(?:\.\d+)?)\b(?![a-zA-Z%])',
        'css_properties': r'([a-z-]+):\s*([^;]+);',
        'transitions': r'(transition|animation):\s*([^;]+);',
        'border_styles': r'border[^:]*:\s*([^;]+);',
        'font_properties': r'(font-[^:]+|line-height):\s*([^;]+);',
        'spacing': r'(margin|padding)[^:]*:\s*([^;]+);',
        'calc_expressions': r'calc\([^)]+\)',
        'role_labels': r'role === \'(\w+)\' \? \'(\w+)\' : \'(\w+)\'',
    }
    
    results = {
        'file_info': {
            'source_file': str(scrollback_file),
            'component': 'MessageScrollback',
            'total_lines': len(content.split('\n'))
        },
        'extracted_values': {},
        'theme_candidates': {},
        'structural_values': {},
        'summary': {}
    }
    
    lines = content.split('\n')
    
    for category, pattern in patterns.items():
        matches = []
        
        for line_num, line in enumerate(lines, 1):
            # Skip lines that look like variable references
            if any(indicator in line for indicator in ['var(--', '$state', 'config.', 'import ', 'theme?.', 'layout?.']):
                continue
                
            for match in re.finditer(pattern, line):
                value = match.group(0)
                context = line.strip()
                
                # Determine if this is a theme candidate or structural
                is_theme = any(keyword in context.lower() for keyword in 
                             ['color', 'background', 'border', 'shadow', 'font', 'opacity'])
                
                matches.append({
                    'value': value,
                    'line_number': line_num,
                    'context': context,
                    'is_theme_candidate': is_theme
                })
        
        if matches:
            results['extracted_values'][category] = matches
            
            # Separate theme candidates from structural values
            theme_matches = [m for m in matches if m['is_theme_candidate']]
            structural_matches = [m for m in matches if not m['is_theme_candidate']]
            
            if theme_matches:
                results['theme_candidates'][category] = theme_matches
            if structural_matches:
                results['structural_values'][category] = structural_matches
            
            results['summary'][category] = {
                'total_instances': len(matches),
                'theme_candidates': len(theme_matches),
                'structural_values': len(structural_matches)
            }
    
    # Calculate totals
    total_instances = sum(data['total_instances'] for data in results['summary'].values())
    total_theme = sum(data['theme_candidates'] for data in results['summary'].values())
    total_structural = sum(data['structural_values'] for data in results['summary'].values())
    
    results['summary']['totals'] = {
        'total_instances': total_instances,
        'theme_candidates': total_theme,
        'structural_values': total_structural,
        'categories': len(results['summary']) - 1
    }
    
    return results

def save_results(results):
    """Save extraction results"""
    
    output_dir = Path("aetherVault/value-mapping")
    output_dir.mkdir(exist_ok=True, parents=True)
    
    # Save complete results
    output_file = output_dir / "scrollback_extracted_values.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    # Save theme migration report
    theme_file = output_dir / "scrollback_theme_migration.md"
    with open(theme_file, 'w', encoding='utf-8') as f:
        f.write("# MessageScrollback Theme Migration Report\n\n")
        f.write("## Values to Move to rainy-night.json\n\n")
        
        if results['theme_candidates']:
            for category, matches in results['theme_candidates'].items():
                f.write(f"### {category.replace('_', ' ').title()}\n")
                for match in matches[:5]:  # Show first 5 examples
                    f.write(f"- Line {match['line_number']}: `{match['value']}`\n")
                    f.write(f"  Context: `{match['context'][:80]}...`\n")
                if len(matches) > 5:
                    f.write(f"  ...and {len(matches) - 5} more\n")
                f.write("\n")
        
        f.write("## Structural Values (Keep in Component)\n\n")
        if results['structural_values']:
            for category, matches in results['structural_values'].items():
                f.write(f"### {category.replace('_', ' ').title()}\n")
                f.write(f"- {len(matches)} instances\n")
                f.write("\n")
    
    # Save summary report
    summary_file = output_dir / "scrollback_extraction_summary.txt"
    with open(summary_file, 'w', encoding='utf-8') as f:
        f.write("MESSAGESCROLLBACK HARDCODED VALUES EXTRACTION SUMMARY\n")
        f.write("=" * 50 + "\n\n")
        
        summary = results['summary']
        f.write(f"📁 Source: {results['file_info']['source_file']}\n")
        f.write(f"📊 Total hardcoded values: {summary['totals']['total_instances']}\n")
        f.write(f"🎨 Theme candidates: {summary['totals']['theme_candidates']}\n")
        f.write(f"🔧 Structural values: {summary['totals']['structural_values']}\n")
        f.write(f"📋 Categories: {summary['totals']['categories']}\n\n")
        
        f.write("BREAKDOWN BY CATEGORY:\n")
        f.write("-" * 25 + "\n")
        
        for category, data in summary.items():
            if category != 'totals':
                f.write(f"{category}:\n")
                f.write(f"  Total: {data['total_instances']}\n")
                f.write(f"  Theme: {data['theme_candidates']}\n")
                f.write(f"  Structural: {data['structural_values']}\n")
    
    return output_file, theme_file, summary_file

def main():
    print("🔍 Extracting hardcoded values from MessageScrollback...")
    
    results = extract_hardcoded_values()
    if not results:
        return
    
    output_file, theme_file, summary_file = save_results(results)
    
    print(f"✅ Extraction complete!")
    print(f"📄 Full results: {output_file}")
    print(f"🎨 Theme migration guide: {theme_file}")
    print(f"📊 Summary: {summary_file}")
    
    # Print quick summary
    summary = results['summary']['totals']
    print(f"\n🎯 Found {summary['total_instances']} hardcoded values")
    print(f"🎨 {summary['theme_candidates']} should move to theme")
    print(f"🔧 {summary['structural_values']} should stay structural")

if __name__ == "__main__":
    main()