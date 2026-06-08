#!/usr/bin/env python3
"""
audit_orphans.py — COO §5 orphan-page auditor.

Builds an inbound-link map across src/content (pages + recipes) and lists
every page that has fewer than 2 inbound internal links.

Usage:
  cd /Users/tun/Projects/softmeal-org
  python3 scripts/audit_orphans.py [--save]

  --save  writes report to measurement/orphan_report.md
"""

import re
import sys
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

CONTENT_ROOT = Path(__file__).parent.parent / "src" / "content"
REPORT_PATH = Path(__file__).parent.parent / "measurement" / "orphan_report.md"
LOCALES = ["en", "ja", "zh-hk", "zh-cn"]
THRESHOLD = 2  # pages with < THRESHOLD inbound links are orphans

# ---------------------------------------------------------------------------
# Regex helpers (shared with audit_internal_links.py)
# ---------------------------------------------------------------------------

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
_RELATED_ARTICLES_RE = re.compile(r"related_articles:\s*\n((?:\s+-\s+[^\n]+\n)+)", re.DOTALL)
_RELATED_ITEM_RE = re.compile(r'^\s+-\s+"?([^\n"]+)"?\s*$', re.MULTILINE)
_MD_LINK_RE = re.compile(r'\[(?:[^\]]*)\]\((/[^)#\s]+|[^)#\s:][^)#\s]*)\)')
# MDX JSX component hrefs: href="/..." or href='...'
_JSX_HREF_RE = re.compile(r'href=["\']([^"\'#\s]+)["\']')


def _strip_frontmatter(text: str) -> str:
    return _FRONTMATTER_RE.sub("", text, count=1)


def _extract_related_articles(text: str) -> list[str]:
    m = _FRONTMATTER_RE.match(text)
    fm = m.group(1) if m else ""
    ra = _RELATED_ARTICLES_RE.search(fm)
    if not ra:
        return []
    return _RELATED_ITEM_RE.findall(ra.group(1))


def _extract_links(text: str) -> list[str]:
    """Extract all internal hrefs from body markdown, JSX, and related_articles."""
    body = _strip_frontmatter(text)
    md = _MD_LINK_RE.findall(body)
    jsx = _JSX_HREF_RE.findall(body)
    related = _extract_related_articles(text)
    return md + jsx + related


# ---------------------------------------------------------------------------
# URL → canonical key
# ---------------------------------------------------------------------------

def canonical_key(locale: str, kind: str, slug: str) -> str:
    """Return a stable string key for a page: 'locale/kind/slug' or 'locale/slug'."""
    if kind == "recipe":
        return f"{locale}/recipes/{slug}"
    return f"{locale}/{slug}"


def href_to_key(href: str) -> str | None:
    """
    Convert an href found in content to a canonical key.
    Returns None for external links or unrecognised patterns.
    """
    href = href.strip().rstrip("/")
    if not href or href.startswith("http") or href.startswith("mailto"):
        return None

    # Absolute: /locale/recipes/slug
    m = re.match(r"^/([a-z]{2}(?:-[a-z]{2})?)/recipes/(.+)$", href)
    if m:
        return f"{m.group(1)}/recipes/{m.group(2)}"

    # Absolute: /locale/slug
    m = re.match(r"^/([a-z]{2}(?:-[a-z]{2})?)/(.+)$", href)
    if m:
        return f"{m.group(1)}/{m.group(2)}"

    # Relative with locale prefix: locale/recipes/slug or locale/slug
    m = re.match(r"^([a-z]{2}(?:-[a-z]{2})?)/recipes/(.+)$", href)
    if m:
        return f"{m.group(1)}/recipes/{m.group(2)}"
    m = re.match(r"^([a-z]{2}(?:-[a-z]{2})?)/(.+)$", href)
    if m:
        return f"{m.group(1)}/{m.group(2)}"

    return None


# ---------------------------------------------------------------------------
# Build page inventory
# ---------------------------------------------------------------------------

def build_inventory() -> dict[str, Path]:
    """Return {canonical_key: filepath} for every content page."""
    inv: dict[str, Path] = {}
    for locale in LOCALES:
        for kind in ("pages", "recipes"):
            folder = CONTENT_ROOT / kind / locale
            if not folder.exists():
                continue
            content_kind = "recipe" if kind == "recipes" else "page"
            for f in folder.glob("*.md*"):
                key = canonical_key(locale, content_kind, f.stem)
                inv[key] = f
    return inv


# ---------------------------------------------------------------------------
# Build inbound-link map
# ---------------------------------------------------------------------------

def build_inbound_map(inventory: dict[str, Path]) -> dict[str, set[str]]:
    """
    Return {target_key: set_of_source_keys}.
    Reads every file in inventory and records which known pages it links to.
    """
    inbound: dict[str, set[str]] = defaultdict(set)
    for source_key, filepath in inventory.items():
        try:
            text = filepath.read_text(encoding="utf-8")
        except Exception:
            continue
        for href in _extract_links(text):
            target_key = href_to_key(href)
            if target_key and target_key in inventory and target_key != source_key:
                inbound[target_key].add(source_key)
    return inbound


# ---------------------------------------------------------------------------
# Identify orphans
# ---------------------------------------------------------------------------

def find_orphans(
    inventory: dict[str, Path],
    inbound: dict[str, set[str]],
    threshold: int = THRESHOLD,
) -> list[dict]:
    orphans = []
    for key in sorted(inventory):
        count = len(inbound.get(key, set()))
        if count < threshold:
            sources = sorted(inbound.get(key, set()))
            orphans.append({"key": key, "inbound": count, "sources": sources})
    return orphans


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------

def generate_report(
    orphans: list[dict],
    inventory: dict[str, Path],
    inbound: dict[str, set[str]],
) -> str:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    total_pages = len(inventory)
    total_orphans = len(orphans)
    zero_inbound = sum(1 for o in orphans if o["inbound"] == 0)
    one_inbound = sum(1 for o in orphans if o["inbound"] == 1)

    lines = [
        "# Orphan Page Audit — COO §5",
        "",
        f"**Rule**: every page should have ≥{THRESHOLD} inbound internal links.",
        f"**Scope**: {total_pages} content pages across {len(LOCALES)} locales.",
        "",
        "## Summary",
        "",
        f"| Metric | Count |",
        f"|--------|-------|",
        f"| Total pages audited | {total_pages} |",
        f"| Orphans (< {THRESHOLD} inbound links) | {total_orphans} |",
        f"| Zero inbound links | {zero_inbound} |",
        f"| One inbound link | {one_inbound} |",
        f"| Coverage (≥ {THRESHOLD} links) | {total_pages - total_orphans} ({100*(total_pages-total_orphans)//total_pages}%) |",
        "",
    ]

    # Per-locale breakdown
    by_locale: dict[str, list[dict]] = defaultdict(list)
    for o in orphans:
        locale = o["key"].split("/")[0]
        by_locale[locale].append(o)

    lines.append("## Per-locale breakdown\n")
    lines.append("| Locale | Total pages | Orphans | Zero inbound | One inbound |")
    lines.append("|--------|------------|---------|-------------|------------|")
    for locale in LOCALES:
        locale_total = sum(1 for k in inventory if k.startswith(locale + "/"))
        oo = by_locale.get(locale, [])
        z = sum(1 for o in oo if o["inbound"] == 0)
        one = sum(1 for o in oo if o["inbound"] == 1)
        lines.append(f"| {locale} | {locale_total} | {len(oo)} | {z} | {one} |")
    lines.append("")

    # Orphan detail tables per locale
    for locale in LOCALES:
        oo = by_locale.get(locale, [])
        if not oo:
            lines.append(f"## `{locale}` — ✅ no orphans\n")
            continue
        lines.append(f"## `{locale}` — {len(oo)} orphans\n")
        lines.append("| Page key | Inbound | Linked from |")
        lines.append("|----------|---------|------------|")
        for o in sorted(oo, key=lambda x: x["inbound"]):
            sources_str = ", ".join(f"`{s}`" for s in o["sources"]) or "—"
            lines.append(f"| `{o['key']}` | {o['inbound']} | {sources_str} |")
        lines.append("")

    lines.append(f"---\n*Generated {ts} by `scripts/audit_orphans.py`*\n")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    save = "--save" in sys.argv

    print("Building page inventory…", file=sys.stderr)
    inventory = build_inventory()

    print(f"Scanning {len(inventory)} pages for links…", file=sys.stderr)
    inbound = build_inbound_map(inventory)

    orphans = find_orphans(inventory, inbound)

    report = generate_report(orphans, inventory, inbound)

    if save:
        REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
        REPORT_PATH.write_text(report, encoding="utf-8")
        print(f"Report saved → {REPORT_PATH}", file=sys.stderr)

    print(report)

    # 3-line tail summary (for verification: tail -3)
    total = len(inventory)
    n_orphans = len(orphans)
    zero = sum(1 for o in orphans if o["inbound"] == 0)
    print(f"\n=== ORPHAN AUDIT COMPLETE: {n_orphans}/{total} pages have <{THRESHOLD} inbound links ===")
    print(f"    zero-inbound:{zero}  one-inbound:{n_orphans - zero}  threshold:{THRESHOLD}")
    print(f"    Full report: measurement/orphan_report.md  (run with --save to write)")

    return 1 if n_orphans > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
