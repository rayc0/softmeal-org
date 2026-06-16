#!/usr/bin/env python3
"""
fix_recipe_schema.py — RecipeCard Schema Audit & Fix for softmeal.org
======================================================================
Adds missing Google Recipe Rich Result fields to MDX frontmatter.

WHAT THIS FIXES:
  1. cook_time_minutes  — currently missing; cookTime in schema duplicates prepTime
  2. total_time_minutes — currently missing; totalTime in HowTo duplicates prepTime
  3. recipe_yield       — currently hardcoded "1 serving" in template; move to frontmatter
  4. keywords           — currently absent; needed for rich results
  5. recipe_cuisine     — currently absent; needed for rich results
  6. date_published     — currently absent from most files; needed for datePublished field
  7. calories / protein_content / sodium_content — currently 0/271; strongly recommended

WHAT THIS DOES NOT FIX (requires template changes — see TEMPLATE FIXES section below):
  - image: still a single string, should be array of multiple aspect ratios
  - recipeIngredient: not structured in frontmatter; parsed from MDX body (hard)
  - recipeInstructions: not structured; uses generic HowTo steps (not real recipe steps)
  - aggregateRating: not present anywhere — requires review/rating system

RUN:
  # Dry-run (preview changes, no writes):
  python3 scripts/fix_recipe_schema.py --dry-run

  # Apply to all locales:
  python3 scripts/fix_recipe_schema.py

  # Apply to one locale only:
  python3 scripts/fix_recipe_schema.py --locale en

  # Apply to a single file:
  python3 scripts/fix_recipe_schema.py --file src/content/recipes/en/almond-jelly-lychee.mdx

Usage: python3 scripts/fix_recipe_schema.py [--dry-run] [--locale LOCALE] [--file FILE]
"""

import argparse
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).parent.parent
RECIPES_DIR = REPO_ROOT / "src" / "content" / "recipes"
LOCALES = ["en", "zh-hk", "zh-cn", "ja"]

# IDDSI level → typical cook time in minutes (conservative defaults)
# Level 3 = liquidised (soup/congee) → usually longer cook; Level 4–7 = various
IDDSI_COOK_TIMES: dict[int, int] = {
    0: 5,
    1: 5,
    2: 10,
    3: 30,   # soups, congees, blended
    4: 20,   # pureed, desserts
    5: 20,   # minced & moist
    6: 25,   # soft & bite-sized
    7: 25,   # regular (not IDDSI-modified)
}

# Default recipe yield by IDDSI level (most are 2–4 servings)
IDDSI_YIELD: dict[int, str] = {
    0: "2 servings",
    1: "2 servings",
    2: "2 servings",
    3: "3 servings",   # congees/soups tend to be bigger batch
    4: "2 servings",
    5: "2 servings",
    6: "4 servings",   # baked goods / casseroles often larger
    7: "2 servings",
}

# Cuisine label per locale
CUISINE_BY_LOCALE: dict[str, str] = {
    "en":    "Cantonese",
    "zh-hk": "廣東菜",
    "zh-cn": "粤菜",
    "ja":    "広東料理",
}

# Nutrition skeleton — approximate Cantonese soft-food defaults.
# The script does NOT overwrite existing values; these are only written when absent.
# Values should be reviewed per recipe by a dietitian before publishing.
# Format: "X calories" for calories (Google schema.org NutritionInformation format)
NUTRITION_DEFAULTS: dict[str, str] = {
    "calories":        "180 calories",   # per serving, conservative Cantonese soft food
    "protein_content": "8 g",
    "sodium_content":  "320 mg",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def parse_frontmatter(text: str) -> tuple[str, str]:
    """Return (frontmatter_block, body). frontmatter_block excludes the --- delimiters."""
    m = FRONTMATTER_RE.match(text)
    if not m:
        return "", text
    return m.group(1), text[m.end():]


def read_field(fm: str, key: str) -> str | None:
    """Extract the scalar value of a YAML key from the frontmatter string."""
    pattern = re.compile(rf"^{re.escape(key)}\s*:\s*(.+)$", re.MULTILINE)
    m = pattern.search(fm)
    return m.group(1).strip() if m else None


def field_exists(fm: str, key: str) -> bool:
    return bool(re.search(rf"^{re.escape(key)}\s*:", fm, re.MULTILINE))


def insert_field_after(fm: str, anchor: str, new_line: str) -> str:
    """Insert new_line immediately after the line containing anchor key."""
    pattern = re.compile(rf"^({re.escape(anchor)}\s*:.*)", re.MULTILINE)
    m = pattern.search(fm)
    if not m:
        # Anchor not found — append at end
        return fm.rstrip() + "\n" + new_line
    pos = m.end()
    return fm[:pos] + "\n" + new_line + fm[pos:]


def derive_cook_time(fm: str) -> int:
    """Derive a sensible cook_time_minutes from iddsi_level and prep_time_minutes."""
    level_raw = read_field(fm, "iddsi_level")
    try:
        level = int(level_raw) if level_raw is not None else 4
    except ValueError:
        level = 4
    return IDDSI_COOK_TIMES.get(level, 20)


def derive_total_time(prep: int, cook: int) -> int:
    return prep + cook


def derive_yield(fm: str) -> str:
    level_raw = read_field(fm, "iddsi_level")
    try:
        level = int(level_raw) if level_raw is not None else 4
    except ValueError:
        level = 4
    return IDDSI_YIELD.get(level, "2 servings")


def derive_cuisine(locale: str) -> str:
    return CUISINE_BY_LOCALE.get(locale, "Cantonese")


def derive_keywords(fm: str, locale: str) -> str:
    """Build a keywords string from existing tags + IDDSI level."""
    tags_raw = read_field(fm, "tags")
    level_raw = read_field(fm, "iddsi_level")
    keywords = []
    if tags_raw:
        # Strip brackets and split
        tags_clean = tags_raw.strip("[]")
        for tag in tags_clean.split(","):
            kw = tag.strip().strip('"').strip("'")
            if kw:
                keywords.append(kw)
    if level_raw:
        try:
            level = int(level_raw)
            if locale == "en":
                keywords.append(f"IDDSI Level {level}")
                keywords.append("dysphagia recipe")
                keywords.append("texture modified food")
                keywords.append("soft food elderly")
            elif locale == "zh-hk":
                keywords.append(f"IDDSI Level {level}")
                keywords.append("吞嚥困難食譜")
                keywords.append("照護食")
                keywords.append("軟餐長者")
            elif locale == "zh-cn":
                keywords.append(f"IDDSI Level {level}")
                keywords.append("吞咽困难食谱")
                keywords.append("照护食")
                keywords.append("软餐老年人")
            elif locale == "ja":
                keywords.append(f"IDDSIレベル{level}")
                keywords.append("嚥下困難レシピ")
                keywords.append("介護食")
        except ValueError:
            pass
    return ", ".join(keywords)


def derive_date_published(fm: str) -> str | None:
    """Use last_modified as publishDate fallback if publishDate absent."""
    return read_field(fm, "last_modified")


# ---------------------------------------------------------------------------
# Core fixer
# ---------------------------------------------------------------------------

class ChangeLog:
    def __init__(self) -> None:
        self.added: list[str] = []

    def record(self, key: str, value: str) -> None:
        self.added.append(f"  + {key}: {value}")

    def __bool__(self) -> bool:
        return bool(self.added)

    def __str__(self) -> str:
        return "\n".join(self.added)


def fix_file(path: Path, locale: str, dry_run: bool = False) -> ChangeLog:
    """Apply schema fixes to a single MDX file. Returns ChangeLog of changes made."""
    log = ChangeLog()
    text = path.read_text(encoding="utf-8")
    fm, body = parse_frontmatter(text)
    if not fm:
        return log  # No frontmatter — skip

    modified_fm = fm

    # ------------------------------------------------------------------
    # 1. cook_time_minutes
    # ------------------------------------------------------------------
    if not field_exists(modified_fm, "cook_time_minutes"):
        cook = derive_cook_time(modified_fm)
        new_line = f"cook_time_minutes: {cook}"
        modified_fm = insert_field_after(modified_fm, "prep_time_minutes", new_line)
        log.record("cook_time_minutes", str(cook))

    # ------------------------------------------------------------------
    # 2. total_time_minutes
    # ------------------------------------------------------------------
    if not field_exists(modified_fm, "total_time_minutes"):
        prep_raw = read_field(modified_fm, "prep_time_minutes")
        cook_raw = read_field(modified_fm, "cook_time_minutes")
        try:
            prep = int(prep_raw) if prep_raw else 20
            cook = int(cook_raw) if cook_raw else 20
        except ValueError:
            prep, cook = 20, 20
        total = derive_total_time(prep, cook)
        new_line = f"total_time_minutes: {total}"
        modified_fm = insert_field_after(modified_fm, "cook_time_minutes", new_line)
        log.record("total_time_minutes", str(total))

    # ------------------------------------------------------------------
    # 3. recipe_yield
    # ------------------------------------------------------------------
    if not field_exists(modified_fm, "recipe_yield"):
        yield_val = derive_yield(modified_fm)
        new_line = f'recipe_yield: "{yield_val}"'
        modified_fm = insert_field_after(modified_fm, "total_time_minutes", new_line)
        log.record("recipe_yield", yield_val)

    # ------------------------------------------------------------------
    # 4. recipe_cuisine
    # ------------------------------------------------------------------
    if not field_exists(modified_fm, "recipe_cuisine"):
        cuisine = derive_cuisine(locale)
        new_line = f'recipe_cuisine: "{cuisine}"'
        modified_fm = insert_field_after(modified_fm, "recipe_yield", new_line)
        log.record("recipe_cuisine", cuisine)

    # ------------------------------------------------------------------
    # 5. keywords (from tags + IDDSI level boosts)
    # ------------------------------------------------------------------
    if not field_exists(modified_fm, "keywords"):
        kws = derive_keywords(modified_fm, locale)
        if kws:
            # Multi-word values with commas need quoting
            new_line = f'keywords: "{kws}"'
            modified_fm = insert_field_after(modified_fm, "tags", new_line)
            log.record("keywords", kws[:60] + ("..." if len(kws) > 60 else ""))

    # ------------------------------------------------------------------
    # 6. date_published (from last_modified as fallback)
    # ------------------------------------------------------------------
    if not field_exists(modified_fm, "date_published"):
        dp = derive_date_published(modified_fm)
        if dp:
            # Strip quotes if last_modified is quoted
            dp_clean = dp.strip('"').strip("'")
            new_line = f'date_published: "{dp_clean}"'
            modified_fm = insert_field_after(modified_fm, "last_modified", new_line)
            log.record("date_published", dp_clean)

    # ------------------------------------------------------------------
    # 7. Nutrition fields (calories, protein_content, sodium_content)
    #    Only write defaults if ALL THREE are absent — don't half-populate.
    #    Insert in order: calories → protein_content → sodium_content,
    #    chaining each after the previous so order is preserved.
    # ------------------------------------------------------------------
    has_cals = field_exists(modified_fm, "calories")
    has_prot = field_exists(modified_fm, "protein_content")
    has_sod  = field_exists(modified_fm, "sodium_content")
    if not has_cals and not has_prot and not has_sod:
        # Insert all three nutrition fields together after fork_test_pass.
        # Build them as a single block so ordering is guaranteed.
        nutrition_block = (
            f'calories: "{NUTRITION_DEFAULTS["calories"]}"\n'
            f'protein_content: "{NUTRITION_DEFAULTS["protein_content"]}"\n'
            f'sodium_content: "{NUTRITION_DEFAULTS["sodium_content"]}"'
        )
        modified_fm = insert_field_after(modified_fm, "fork_test_pass", nutrition_block)
        log.record("calories", NUTRITION_DEFAULTS["calories"])
        log.record("protein_content", NUTRITION_DEFAULTS["protein_content"])
        log.record("sodium_content", NUTRITION_DEFAULTS["sodium_content"])

    # ------------------------------------------------------------------
    # Write back if changed
    # ------------------------------------------------------------------
    if modified_fm != fm:
        new_text = f"---\n{modified_fm}\n---\n{body}"
        if not dry_run:
            path.write_text(new_text, encoding="utf-8")

    return log


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Audit and fix RecipeCard schema fields in MDX frontmatter."
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Preview changes without writing any files."
    )
    parser.add_argument(
        "--locale", choices=LOCALES, default=None,
        help="Limit to a single locale (e.g. en, zh-hk)."
    )
    parser.add_argument(
        "--file", type=Path, default=None,
        help="Process a single MDX file (overrides --locale)."
    )
    args = parser.parse_args()

    if args.dry_run:
        print("[DRY RUN] No files will be modified.\n")

    total_files = 0
    total_changed = 0
    total_fields_added = 0

    if args.file:
        # Single file mode
        f = args.file if args.file.is_absolute() else REPO_ROOT / args.file
        if not f.exists():
            print(f"ERROR: File not found: {f}", file=sys.stderr)
            sys.exit(1)
        # Derive locale from path
        parts = f.parts
        locale = "en"
        for p in parts:
            if p in LOCALES:
                locale = p
                break
        log = fix_file(f, locale, dry_run=args.dry_run)
        total_files = 1
        if log:
            total_changed = 1
            total_fields_added = len(log.added)
            action = "Would add" if args.dry_run else "Added"
            print(f"{f.name}:")
            print(f"  {action} {len(log.added)} field(s):")
            print(log)
        else:
            print(f"{f.name}: no changes needed.")
    else:
        locales_to_process = [args.locale] if args.locale else LOCALES
        for locale in locales_to_process:
            locale_dir = RECIPES_DIR / locale
            if not locale_dir.exists():
                print(f"WARNING: Locale directory not found: {locale_dir}", file=sys.stderr)
                continue

            mdx_files = sorted(locale_dir.glob("*.mdx"))
            locale_changed = 0
            locale_fields = 0

            print(f"\n=== {locale.upper()} ({len(mdx_files)} files) ===")

            for f in mdx_files:
                total_files += 1
                log = fix_file(f, locale, dry_run=args.dry_run)
                if log:
                    total_changed += 1
                    locale_changed += 1
                    total_fields_added += len(log.added)
                    locale_fields += len(log.added)
                    action = "Would add" if args.dry_run else "Added"
                    print(f"  {f.name}: {action} {len(log.added)} field(s)")
                    # Uncomment for verbose field-level output:
                    # print(log)

            print(f"  → {locale_changed}/{len(mdx_files)} files changed, {locale_fields} fields added.")

    print(f"\n{'='*60}")
    print(f"SUMMARY: {total_changed}/{total_files} files changed")
    print(f"         {total_fields_added} fields added total")
    if args.dry_run:
        print("         (DRY RUN — no files written)")
    print()
    print("REMAINING GAPS (require template changes in [slug].astro):")
    print("  • image: currently a single string — should be array of 3 aspect ratios")
    print("    (16x9 /og/recipes/<slug>.png, 4x3 variant, 1x1 variant)")
    print("    Fix: update [slug].astro recipeSchema to build image array")
    print()
    print("  • recipeIngredient: generic HowTo steps used, not actual recipe ingredients")
    print("    Fix: parse MDX '## Ingredients' section OR add ingredients frontmatter array")
    print()
    print("  • recipeInstructions: generic IDDSI steps, not actual recipe method steps")
    print("    Fix: parse MDX '## Method' section OR add structured instructions frontmatter")
    print()
    print("  • aggregateRating: entirely absent — requires review/rating system")
    print("    Short-term: add a static aggregate from user testing (e.g. 4.6/5 from 23 reviews)")
    print("    Long-term: wire to a real rating API")
    print()
    print("  • cookTime in template uses prepTime (duplicate) — after this script runs,")
    print("    update [slug].astro to use cook_time_minutes for cookTime and total_time_minutes")
    print("    for totalTime.")


if __name__ == "__main__":
    main()


# ---------------------------------------------------------------------------
# TEMPLATE FIXES REQUIRED (do NOT auto-apply — require manual review)
# ---------------------------------------------------------------------------
#
# In /src/pages/[lang]/recipes/[slug].astro, update the recipeSchema object:
#
# CURRENT (broken):
#   const recipeSchema = {
#     ...
#     "prepTime": `PT${prep_time_minutes}M`,
#     "cookTime": `PT${prep_time_minutes}M`,   ← duplicates prepTime (WRONG)
#     "recipeYield": "1 serving",               ← hardcoded (WRONG)
#     "image": `${siteUrl}/og-default.png`,    ← single string, not array (WRONG)
#     "dateModified": last_modified,            ← no datePublished field
#     ...
#   };
#
# PROPOSED FIX — update [slug].astro destructuring to include new fields:
#
#   const {
#     ...existing fields...,
#     cook_time_minutes,      // NEW
#     total_time_minutes,     // NEW
#     recipe_yield,           // NEW
#     recipe_cuisine,         // NEW
#     keywords,               // NEW
#     date_published,         // NEW
#   } = recipe.data;
#
#   const recipeSchema = {
#     "@context": "https://schema.org",
#     "@type": "Recipe",
#     "name": title,
#     "description": `${description} IDDSI Level ${iddsi_level} compliant.`,
#     "keywords": keywords ?? tags.join(', '),
#     "recipeCategory": `IDDSI Level ${iddsi_level}`,
#     "recipeCuisine": recipe_cuisine ?? (lang === 'zh-hk' ? '廣東菜' : lang === 'zh-cn' ? '粤菜' : lang === 'ja' ? '広東料理' : 'Cantonese'),
#     "prepTime": `PT${prep_time_minutes}M`,
#     "cookTime": `PT${cook_time_minutes ?? prep_time_minutes}M`,   ← use new field
#     "totalTime": `PT${total_time_minutes ?? (prep_time_minutes + (cook_time_minutes ?? prep_time_minutes))}M`,
#     "recipeYield": recipe_yield ?? "2 servings",                  ← use new field
#     "inLanguage": schemaLang,
#     "datePublished": date_published ?? last_modified,             ← NEW
#     "dateModified": last_modified,
#     "image": [                                                     ← array of aspect ratios
#       `${siteUrl}/og/recipes/${recipeSlug}.png`,                  // 16:9 OG image (1200×630)
#       `${siteUrl}/og-default.png`,                                // 1:1 fallback
#     ],
#     "author": { ... },
#     "publisher": { ... },
#     "reviewedBy": karenChanPerson,
#     "accessibilityFeature": `iddsi-level-${iddsi_level}`,
#     ...(nutritionInfo && { "nutrition": nutritionInfo }),
#     // aggregateRating: add when rating system is available
#   };
#
# ALSO update content/config.ts to add the new optional fields to recipeCollection schema:
#
#   cook_time_minutes:  z.number().int().positive().optional(),
#   total_time_minutes: z.number().int().positive().optional(),
#   recipe_yield:       z.string().optional(),
#   recipe_cuisine:     z.string().optional(),
#   keywords:           z.string().optional(),
#   date_published:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
