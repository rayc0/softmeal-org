#!/usr/bin/env python3
"""
audit_internal_links.py — COO §5 hub-and-spoke internal link auditor.

Rule: every spoke page must have:
  - 1-up:   ≥1 link to its hub/parent
  - 2-side: ≥2 links to sibling pages (same category prefix)
  - 1-down: ≥1 link to a recipe page  (/locale/recipes/...)
  - 1-tool: ≥1 link to a tool/test/checklist page

Usage:
  cd /Users/tun/Projects/softmeal-org
  python3 scripts/audit_internal_links.py [--save]

  --save  writes report to measurement/internal_link_report.md
"""

import re
import sys
import os
from pathlib import Path
from collections import defaultdict

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

CONTENT_ROOT = Path(__file__).parent.parent / "src" / "content"
REPORT_PATH = Path(__file__).parent.parent / "measurement" / "internal_link_report.md"

LOCALES = ["en", "ja", "zh-hk", "zh-cn"]

# Category prefix → list of hub slug candidates (slug only, no locale prefix).
# First match wins; if the hub doesn't exist in the locale, the rule is skipped.
CATEGORY_HUB_MAP: dict[str, list[str]] = {
    "assessment":  ["for-professionals", "assessment", "dysphagia"],
    "caregiver":   ["family-caregiver-guide-ja", "caregiver-guide-hk", "family-caregiver-guide", "dysphagia"],
    "clinical":    ["for-professionals", "dysphagia"],
    "conditions":  ["dysphagia"],
    "family":      ["family-caregiver-guide-ja", "family-caregiver-guide"],
    "nutrition":   ["elderly-nutrition", "nutrition-elderly-japan", "elderly-nutrition-hk"],
    "iddsi":       ["iddsi-guide", "iddsi-guide-ja"],
    "operations":  ["for-professionals", "care-home-iddsi", "care-home-feeding"],
}

# Slug patterns that identify "tool" pages (regex applied to slug without locale).
TOOL_PATTERNS = [
    re.compile(r"^tools$"),
    re.compile(r".*-tool(s)?(-|$)"),
    re.compile(r".*-test(-|$)"),
    re.compile(r".*-checklist(-|$)"),
    re.compile(r".*-comparison(-|$)"),
    re.compile(r".*-calculator(-|$)"),
    re.compile(r".*-screening(-|$)"),
    re.compile(r".*-assessment(-|$)"),
    re.compile(r"eat-10.*"),
    re.compile(r".*flow-test.*"),
    re.compile(r".*fork-drip.*"),
    re.compile(r".*spoon-tilt.*"),
    re.compile(r".*mizunomi.*"),
]

# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
_RELATED_ARTICLES_RE = re.compile(r"related_articles:\s*\n((?:\s+-\s+[^\n]+\n)+)", re.DOTALL)
_RELATED_ITEM_RE = re.compile(r'^\s+-\s+"?([^\n"]+)"?\s*$', re.MULTILINE)
# Markdown links: [text](/path)  or  [text](relative-path)
_MD_LINK_RE = re.compile(r'\[(?:[^\]]*)\]\((/[^)#\s]+|[^)#\s:][^)#\s]*)\)')


def parse_frontmatter_text(text: str) -> str:
    """Return the raw YAML frontmatter block (or empty string)."""
    m = _FRONTMATTER_RE.match(text)
    return m.group(1) if m else ""


def extract_related_articles(fm_text: str) -> list[str]:
    """Extract related_articles list items from frontmatter YAML."""
    m = _RELATED_ARTICLES_RE.search(fm_text)
    if not m:
        return []
    return _RELATED_ITEM_RE.findall(m.group(1))


def extract_body_links(text: str) -> list[str]:
    """Extract all markdown link hrefs from body (after stripping frontmatter)."""
    body = _FRONTMATTER_RE.sub("", text, count=1)
    return _MD_LINK_RE.findall(body)


def slug_from_path(path: Path) -> str:
    """Return bare slug (no extension)."""
    return path.stem


def category_prefix(slug: str) -> str | None:
    """Return the category prefix if slug matches a known spoke pattern."""
    for prefix in CATEGORY_HUB_MAP:
        if slug.startswith(prefix + "-"):
            return prefix
    return None


def is_tool_slug(slug: str) -> bool:
    return any(p.match(slug) for p in TOOL_PATTERNS)


def normalize_href(href: str, locale: str) -> tuple[str, str] | None:
    """
    Return (kind, slug) where kind is 'page' | 'recipe' | None.
    Accepts absolute paths (/locale/slug) or bare slugs.
    """
    href = href.strip().rstrip("/")
    # Absolute path /locale/recipes/slug
    m = re.match(r"^/([a-z]{2}(?:-[a-z]{2})?)/recipes/(.+)$", href)
    if m:
        return ("recipe", m.group(2))
    # Absolute path /locale/slug
    m = re.match(r"^/([a-z]{2}(?:-[a-z]{2})?)/(.+)$", href)
    if m:
        return ("page", m.group(2))
    # Relative: starts with ja/ or zh-hk/ etc (from related_articles)
    m = re.match(r"^([a-z]{2}(?:-[a-z]{2})?)/(.+)$", href)
    if m:
        kind = "recipe" if href.startswith(m.group(1) + "/recipes/") else "page"
        return (kind, m.group(2))
    # Plain slug (no locale)
    if "/" not in href and href and not href.startswith("http"):
        return ("page", href)
    return None


# ---------------------------------------------------------------------------
# Build page index
# ---------------------------------------------------------------------------

def build_page_index() -> dict[str, set[str]]:
    """
    Return {locale: set_of_slugs} for all pages and recipes.
    Used to validate that linked targets actually exist.
    """
    index: dict[str, set[str]] = defaultdict(set)
    for locale in LOCALES:
        for d in ["pages", "recipes"]:
            folder = CONTENT_ROOT / d / locale
            if not folder.exists():
                continue
            for f in folder.glob("*.md*"):
                index[locale].add(f.stem)
    return index


# ---------------------------------------------------------------------------
# Audit logic
# ---------------------------------------------------------------------------

def audit_locale(locale: str, page_index: dict[str, set[str]]) -> list[dict]:
    """Audit all spoke pages for a given locale. Returns list of violation dicts."""
    violations = []
    pages_dir = CONTENT_ROOT / "pages" / locale
    if not pages_dir.exists():
        return []

    # Collect all page slugs in this locale (pages + recipes)
    local_pages = page_index.get(locale, set())

    for filepath in sorted(pages_dir.glob("*.md*")):
        slug = slug_from_path(filepath)
        prefix = category_prefix(slug)
        if prefix is None:
            # Not a categorised spoke — treat as hub, skip
            continue

        text = filepath.read_text(encoding="utf-8")
        fm = parse_frontmatter_text(text)
        related = extract_related_articles(fm)
        body_links = extract_body_links(text)

        # Combine all outgoing links
        all_hrefs: list[str] = list(body_links) + list(related)
        # Resolve each href to (kind, slug)
        resolved: list[tuple[str, str]] = []
        for href in all_hrefs:
            r = normalize_href(href, locale)
            if r:
                resolved.append(r)

        page_slugs  = [s for (k, s) in resolved if k == "page"]
        recipe_slugs = [s for (k, s) in resolved if k == "recipe"]

        # 1-up: link to a known hub for this prefix
        hub_candidates = CATEGORY_HUB_MAP.get(prefix, [])
        # Filter to hubs that actually exist in this locale
        valid_hubs = [h for h in hub_candidates if h in local_pages]
        has_up = any(s in valid_hubs for s in page_slugs)

        # 2-side: links to pages with same prefix (but different slug)
        sibling_links = [
            s for s in page_slugs
            if s != slug and s.startswith(prefix + "-") and s in local_pages
        ]
        has_side = len(sibling_links) >= 2

        # 1-recipe: any link to a recipe page
        has_recipe = len(recipe_slugs) > 0

        # 1-tool: any link to a tool-type page
        tool_links = [s for s in page_slugs if is_tool_slug(s) and s in local_pages]
        has_tool = len(tool_links) > 0

        missing = []
        if not has_up:
            hub_note = f"(valid hubs: {valid_hubs or hub_candidates})"
            missing.append(f"1-up {hub_note}")
        if not has_side:
            missing.append(f"2-side (found {len(sibling_links)}: {sibling_links})")
        if not has_recipe:
            missing.append("1-recipe")
        if not has_tool:
            missing.append("1-tool")

        if missing:
            violations.append({
                "locale": locale,
                "slug": slug,
                "prefix": prefix,
                "missing": missing,
                "sibling_count": len(sibling_links),
                "recipe_count": len(recipe_slugs),
                "tool_count": len(tool_links),
                "has_up": has_up,
            })

    return violations


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------

def summarise(all_violations: list[dict]) -> str:
    lines = [
        "# Internal Link Audit — COO §5 Hub-and-Spoke",
        "",
        "Rule: every spoke page must link **1-up** (hub) · **2-side** (siblings) · **1-recipe** · **1-tool**.",
        "",
    ]

    # Tally by locale
    by_locale: dict[str, list[dict]] = defaultdict(list)
    for v in all_violations:
        by_locale[v["locale"]].append(v)

    total_violations = len(all_violations)
    lines.append(f"## Summary — {total_violations} spoke pages with violations\n")
    lines.append("| Locale | Violating spokes | Missing up | Missing side | Missing recipe | Missing tool |")
    lines.append("|--------|-----------------|-----------|-------------|---------------|-------------|")
    for locale in LOCALES:
        vv = by_locale.get(locale, [])
        up    = sum(1 for v in vv if not v["has_up"])
        side  = sum(1 for v in vv if v["sibling_count"] < 2)
        rec   = sum(1 for v in vv if v["recipe_count"] == 0)
        tool  = sum(1 for v in vv if v["tool_count"] == 0)
        lines.append(f"| {locale} | {len(vv)} | {up} | {side} | {rec} | {tool} |")
    lines.append("")

    # Breakdown by missing type
    missing_counts: dict[str, int] = defaultdict(int)
    for v in all_violations:
        for m in v["missing"]:
            key = m.split(" ")[0]  # "1-up", "2-side", "1-recipe", "1-tool"
            missing_counts[key] += 1

    lines.append("## Missing-link type breakdown\n")
    for k, cnt in sorted(missing_counts.items(), key=lambda x: -x[1]):
        lines.append(f"- **{k}**: {cnt} pages")
    lines.append("")

    # Per-locale detail
    for locale in LOCALES:
        vv = by_locale.get(locale, [])
        if not vv:
            lines.append(f"## `{locale}` — ✅ no violations\n")
            continue
        lines.append(f"## `{locale}` — {len(vv)} violations\n")
        lines.append("| Slug | Category | Missing |")
        lines.append("|------|----------|---------|")
        for v in sorted(vv, key=lambda x: (x["prefix"], x["slug"])):
            missing_str = " · ".join(v["missing"])
            lines.append(f"| `{v['slug']}` | `{v['prefix']}` | {missing_str} |")
        lines.append("")

    # Generate date
    from datetime import datetime, timezone
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines.append(f"---\n*Generated {ts} by `scripts/audit_internal_links.py`*\n")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    save = "--save" in sys.argv

    page_index = build_page_index()
    all_violations: list[dict] = []

    for locale in LOCALES:
        v = audit_locale(locale, page_index)
        all_violations.extend(v)

    report = summarise(all_violations)

    if save:
        REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
        REPORT_PATH.write_text(report, encoding="utf-8")
        print(f"Report saved → {REPORT_PATH}")

    print(report)

    # Print 3-line summary last (for verification tail -3)
    total = len(all_violations)
    up_fail   = sum(1 for v in all_violations if not v["has_up"])
    side_fail = sum(1 for v in all_violations if v["sibling_count"] < 2)
    rec_fail  = sum(1 for v in all_violations if v["recipe_count"] == 0)
    tool_fail = sum(1 for v in all_violations if v["tool_count"] == 0)
    print(f"\n=== AUDIT COMPLETE: {total} spoke pages violate link rules ===")
    print(f"    missing-up:{up_fail}  missing-side:{side_fail}  missing-recipe:{rec_fail}  missing-tool:{tool_fail}")
    print(f"    Full report: measurement/internal_link_report.md  (run with --save to write)")

    return 1 if total > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
