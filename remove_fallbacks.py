#!/usr/bin/env python3
import re
import os

def remove_fallbacks(file_path):
    """Remove all || fallback values from a file."""
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Pattern to match {variable || 'fallback'} or {variable || "fallback"}
    # This handles both single and double quotes
    pattern = r'(\{[^}]*?\?\.[^}]*?)\s*\|\|\s*[\'"][^\'"}]+[\'"](\})'
    
    # Replace with just the variable part without the fallback
    modified_content = re.sub(pattern, r'\1\2', content)
    
    # Also handle numeric fallbacks without quotes
    pattern2 = r'(\{[^}]*?\?\.[^}]*?)\s*\|\|\s*[\d.]+(\})'
    modified_content = re.sub(pattern2, r'\1\2', modified_content)
    
    # Count changes
    count = len(re.findall(r'\|\|', original_content)) - len(re.findall(r'\|\|', modified_content))
    
    if count > 0:
        with open(file_path, 'w') as f:
            f.write(modified_content)
        print(f"✅ {file_path}: Removed {count} fallback values")
    else:
        print(f"ℹ️  {file_path}: No fallbacks found")
    
    return count

def main():
    # List of files to process
    files = [
        "/Users/d.patnaik/code/atomicaether/apps/web/src/lib/bricks/InputBarUI/core/InputBarUI.svelte",
        "/Users/d.patnaik/code/atomicaether/apps/web/src/lib/components/ThemePickerUI/ThemePickerUI.svelte",
        "/Users/d.patnaik/code/atomicaether/apps/web/src/lib/bricks/MessageScrollback/core/MarkdownRenderer.svelte",
        "/Users/d.patnaik/code/atomicaether/apps/web/src/lib/bricks/MessageScrollback/core/MessageScrollback.svelte",
        "/Users/d.patnaik/code/atomicaether/apps/web/src/lib/bricks/RecycleBinScrollback/core/RecycleBinScrollback.svelte",
    ]
    
    print("🔥 ACID TEST: Removing ALL fallback values!\n")
    print("=" * 50)
    
    total = 0
    for file_path in files:
        if os.path.exists(file_path):
            count = remove_fallbacks(file_path)
            total += count
    
    print("=" * 50)
    print(f"\n🎯 Total fallback values removed: {total}")
    print("\n⚠️  WARNING: App may break if theme variables are missing!")

if __name__ == "__main__":
    main()