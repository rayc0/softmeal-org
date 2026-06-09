#!/usr/bin/env python3
"""
Add 軟餐 keyword to zh-HK recipe titles and 软餐 to zh-CN.
EN/JA titles already have IDDSI level which differentiates from general food blogs.

Gemini's formula: {RecipeName}軟餐食譜 (IDDSI 第{Level}級)
"""

import os
import re
import glob

RECIPE_DIRS = {
    'zh-hk': '/Users/tun/Projects/softmeal-org/src/content/recipes/zh-hk',
    'zh-cn': '/Users/tun/Projects/softmeal-org/src/content/recipes/zh-cn',
    'en': '/Users/tun/Projects/softmeal-org/src/content/recipes/en',
    'ja': '/Users/tun/Projects/softmeal-org/src/content/recipes/ja',
}

def transform_title_zhhk(title, iddsi_level):
    """Apply Gemini's formula to zh-HK titles."""
    # Skip if already has 軟餐 or 照護食
    if '軟餐' in title or '照護食' in title:
        return title

    # Extract recipe name — everything before the first | or （ or (IDDSI
    name_match = re.match(r'^"?(.+?)(?:\s*[|｜]\s*|\s*（IDDSI|\s*\(IDDSI)', title.strip('"'))
    if not name_match:
        return title

    recipe_name = name_match.group(1).strip()

    # Build level string from iddsi_level field
    # Handle ranges like 3-4 or 3–4
    level_str = str(iddsi_level)

    new_title = f'{recipe_name}軟餐食譜 (IDDSI 第{level_str}級)'
    return f'"{new_title}"'

def transform_title_zhcn(title, iddsi_level):
    """Add 软餐 to zh-CN titles."""
    if '软餐' in title or '照护食' in title:
        return title

    name_match = re.match(r'^"?(.+?)(?:\s*[|｜]\s*|\s*（IDDSI|\s*\(IDDSI)', title.strip('"'))
    if not name_match:
        return title

    recipe_name = name_match.group(1).strip()
    level_str = str(iddsi_level)
    new_title = f'{recipe_name}软餐食谱 (IDDSI 第{level_str}级)'
    return f'"{new_title}"'

def transform_title_en(title, iddsi_level):
    """Add Dysphagia-Friendly to EN titles that just have generic 'Recipe'."""
    # EN titles already have IDDSI Level which differentiates — only fix generic ones
    if 'Dysphagia' in title or 'Soft Meal' in title or 'IDDSI' in title:
        return title  # Already has differentiating keyword

    # Add IDDSI level if completely missing
    name_match = re.match(r'^"?(.+?)(?:\s*[|]\s*|\s*Recipe)', title.strip('"'))
    if not name_match:
        return title

    recipe_name = name_match.group(1).strip()
    level_str = str(iddsi_level)
    new_title = f'{recipe_name} | IDDSI Level {level_str} Dysphagia Recipe'
    return f'"{new_title}"'

def transform_title_ja(title, iddsi_level):
    """Add 介護食 to JA titles missing it."""
    if '介護食' in title or 'IDDSI' in title:
        return title

    name_match = re.match(r'^"?(.+?)(?:\s*[|｜]\s*|\s*（IDDSI|\s*\(IDDSI)', title.strip('"'))
    if not name_match:
        return title

    recipe_name = name_match.group(1).strip()
    level_str = str(iddsi_level)
    new_title = f'{recipe_name}介護食レシピ (IDDSI 第{level_str}レベル)'
    return f'"{new_title}"'

TRANSFORMERS = {
    'zh-hk': transform_title_zhhk,
    'zh-cn': transform_title_zhcn,
    'en': transform_title_en,
    'ja': transform_title_ja,
}

def process_file(filepath, locale):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract frontmatter
    fm_match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not fm_match:
        return False, None, None

    frontmatter = fm_match.group(1)

    # Get current title
    title_match = re.search(r'^title:\s*(.+)$', frontmatter, re.MULTILINE)
    if not title_match:
        return False, None, None

    current_title = title_match.group(1)

    # Get iddsi_level
    level_match = re.search(r'^iddsi_level:\s*(.+)$', frontmatter, re.MULTILINE)
    if not level_match:
        return False, None, None

    iddsi_level = level_match.group(1).strip()

    # Transform
    transform = TRANSFORMERS[locale]
    new_title = transform(current_title, iddsi_level)

    if new_title == current_title:
        return False, current_title, None

    # Replace title in frontmatter
    new_content = content.replace(
        f'title: {current_title}',
        f'title: {new_title}',
        1
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    return True, current_title, new_title

def main():
    total_changed = 0
    total_skipped = 0

    for locale, dir_path in RECIPE_DIRS.items():
        if not os.path.exists(dir_path):
            print(f'⚠ Directory not found: {dir_path}')
            continue

        files = sorted(glob.glob(os.path.join(dir_path, '*.mdx')))
        changed = 0
        skipped = 0

        print(f'\n=== {locale.upper()} ({len(files)} files) ===')

        for filepath in files:
            filename = os.path.basename(filepath)
            was_changed, old_title, new_title = process_file(filepath, locale)

            if was_changed:
                changed += 1
                print(f'  ✓ {filename}')
                print(f'    OLD: {old_title}')
                print(f'    NEW: {new_title}')
            else:
                skipped += 1

        print(f'  → Changed: {changed} | Skipped (already good): {skipped}')
        total_changed += changed
        total_skipped += skipped

    print(f'\n=== TOTAL: {total_changed} titles updated, {total_skipped} already optimized ===')

if __name__ == '__main__':
    main()
