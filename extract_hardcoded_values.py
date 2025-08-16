#!/usr/bin/env python3
"""
Extract all hardcoded values from AtomicAether sandbox code.
Essential Boss Rule 8: No Hardcoding - Everything Lives in Config

Finds: colors, dimensions, durations, URLs, strings, gradients, shadows, etc.
"""

import re
import os
import json
from pathlib import Path
from typing import Dict, List, Set

class HardcodedValueExtractor:
    def __init__(self):
        self.findings = {
            'colors': set(),
            'dimensions': set(), 
            'durations': set(),
            'gradients': set(),
            'shadows': set(),
            'borders': set(),
            'strings': set(),
            'urls': set(),
            'numbers': set(),
            'css_properties': set()
        }
        
        # Regex patterns for different types of hardcoded values
        self.patterns = {
            'colors': [
                r'#[0-9a-fA-F]{3,8}',  # hex colors
                r'rgba?\([^)]+\)',      # rgb/rgba
                r'hsla?\([^)]+\)',      # hsl/hsla
                r'\b(?:red|blue|green|white|black|yellow|purple|orange|pink|gray|grey|transparent)\b'
            ],
            'dimensions': [
                r'\b\d+(?:\.\d+)?(?:px|em|rem|vh|vw|%|pt|pc|in|cm|mm)\b',
                r'\bcalc\([^)]+\)',
                r'\b\d+(?:\.\d+)?\s*(?:px|em|rem|vh|vw|%)'
            ],
            'durations': [
                r'\b\d+(?:\.\d+)?s\b',
                r'\b\d+ms\b'
            ],
            'gradients': [
                r'linear-gradient\([^)]+\)',
                r'radial-gradient\([^)]+\)',
                r'conic-gradient\([^)]+\)'
            ],
            'shadows': [
                r'box-shadow:\s*[^;]+',
                r'text-shadow:\s*[^;]+',
                r'drop-shadow\([^)]+\)',
                r'\d+px\s+\d+px\s+\d+px\s+[^,;]+'
            ],
            'borders': [
                r'border[^:]*:\s*[^;]+',
                r'\b\d+(?:\.\d+)?px\s+solid\s+[^;]+',
                r'border-radius:\s*[^;]+'
            ],
            'strings': [
                r'"[^"]{3,}"',  # quoted strings longer than 3 chars
                r"'[^']{3,}'"   # single quoted strings
            ],
            'urls': [
                r'url\([^)]+\)',
                r'https?://[^\s)]+',
                r'www\.[^\s)]+',
                r'/[^\s)"\']+'  # paths
            ],
            'numbers': [
                r'\b\d{2,}\b',  # numbers with 2+ digits
                r'\b\d+\.\d+\b' # decimal numbers
            ]
        }

    def extract_from_file(self, file_path: Path) -> Dict:
        """Extract hardcoded values from a single file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return {}
            
        file_findings = {}
        
        for category, patterns in self.patterns.items():
            matches = set()
            for pattern in patterns:
                found = re.findall(pattern, content, re.IGNORECASE | re.MULTILINE)
                matches.update(found)
            
            if matches:
                file_findings[category] = list(matches)
                self.findings[category].update(matches)
        
        return file_findings

    def scan_sandboxes(self, base_path: str = "/Users/d.patnaik/code/atomicaether/apps/web/src/routes/sandboxes") -> Dict:
        """Scan all sandbox files for hardcoded values."""
        results = {}
        sandbox_path = Path(base_path)
        
        if not sandbox_path.exists():
            print(f"Sandbox path not found: {sandbox_path}")
            return results
            
        # Find all .svelte files in sandboxes
        svelte_files = list(sandbox_path.glob("**/*.svelte"))
        
        print(f"Scanning {len(svelte_files)} sandbox files...")
        
        for file_path in svelte_files:
            relative_path = str(file_path.relative_to(sandbox_path))
            file_findings = self.extract_from_file(file_path)
            
            if file_findings:
                results[relative_path] = file_findings
                
        return results

    def generate_config_structure(self) -> Dict:
        """Generate suggested config file structure based on findings."""
        config_structure = {}
        
        # InputBar visual config
        if self.findings['colors'] or self.findings['gradients'] or self.findings['shadows']:
            config_structure['inputbar-visual.json'] = {
                'colors': list(self.findings['colors'])[:10],  # limit output
                'gradients': list(self.findings['gradients'])[:5],
                'shadows': list(self.findings['shadows'])[:5]
            }
            
        # InputBar layout config  
        if self.findings['dimensions']:
            config_structure['inputbar-layout.json'] = {
                'dimensions': list(self.findings['dimensions'])[:15]
            }
            
        # Animation config
        if self.findings['durations']:
            config_structure['inputbar-animations.json'] = {
                'durations': list(self.findings['durations'])
            }
            
        return config_structure

    def generate_report(self, scan_results: Dict) -> str:
        """Generate comprehensive report of findings."""
        report = []
        report.append("=" * 80)
        report.append("HARDCODED VALUES EXTRACTION REPORT")
        report.append("Essential Boss Rule 8: No Hardcoding - Everything Lives in Config")
        report.append("=" * 80)
        report.append("")
        
        # Summary
        total_files = len(scan_results)
        total_values = sum(len(self.findings[cat]) for cat in self.findings)
        
        report.append(f"📊 SUMMARY:")
        report.append(f"   Files scanned: {total_files}")
        report.append(f"   Total unique hardcoded values found: {total_values}")
        report.append("")
        
        # Breakdown by category
        report.append("📋 BREAKDOWN BY CATEGORY:")
        for category, values in self.findings.items():
            if values:
                report.append(f"   {category.upper()}: {len(values)} unique values")
        report.append("")
        
        # Detailed findings
        report.append("🔍 DETAILED FINDINGS:")
        report.append("")
        
        for file_path, file_findings in scan_results.items():
            report.append(f"📄 {file_path}")
            for category, values in file_findings.items():
                if values:
                    report.append(f"   {category}: {len(values)} values")
                    for value in values[:5]:  # Show first 5
                        report.append(f"      • {value}")
                    if len(values) > 5:
                        report.append(f"      ... and {len(values) - 5} more")
            report.append("")
            
        # Config suggestions
        config_structure = self.generate_config_structure()
        if config_structure:
            report.append("⚙️  SUGGESTED CONFIG FILES:")
            report.append("")
            for config_file, structure in config_structure.items():
                report.append(f"📁 aetherVault/config/{config_file}")
                report.append(json.dumps(structure, indent=2))
                report.append("")
        
        return "\n".join(report)

def main():
    print("🔍 Scanning AtomicAether sandboxes for hardcoded values...")
    
    extractor = HardcodedValueExtractor()
    scan_results = extractor.scan_sandboxes()
    
    if not scan_results:
        print("❌ No sandbox files found or no hardcoded values detected")
        return
        
    # Generate and save report
    report = extractor.generate_report(scan_results)
    
    # Save to file
    report_path = Path("/Users/d.patnaik/code/atomicaether/hardcoded_values_report.txt")
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"✅ Report saved to: {report_path}")
    print()
    print("🎯 KEY FINDINGS:")
    for category, values in extractor.findings.items():
        if values:
            print(f"   {category.upper()}: {len(values)} unique values")
    
    print(f"\n📊 Total hardcoded values to externalize: {sum(len(values) for values in extractor.findings.values())}")
    print("\n⚠️  These ALL need to be moved to config files per Essential Boss Rule 8!")

if __name__ == "__main__":
    main()