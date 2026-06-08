#!/usr/bin/env python3
"""
Audit meta descriptions across all built HTML pages.
Usage: python3 scripts/audit_meta_description.py <dist_dir>
Exits 0 if all pages have valid descriptions, 1 if any are missing/empty.
"""

import sys
import os
import re
from pathlib import Path

MIN_LEN = 40
MAX_LEN = 200

# Two patterns per attribute order × two quote styles → 4 total.
# Keep quote chars separate so a double-quoted value containing ' isn't truncated.
_META_PATTERNS = [
    # name=... content=...
    re.compile(r'<meta\s+[^>]*name="description"[^>]*content="([^"]*)"', re.IGNORECASE),
    re.compile(r"<meta\s+[^>]*name='description'[^>]*content='([^']*)'", re.IGNORECASE),
    # content=... name=...
    re.compile(r'<meta\s+[^>]*content="([^"]*)"[^>]*name="description"', re.IGNORECASE),
    re.compile(r"<meta\s+[^>]*content='([^']*)'[^>]*name='description'", re.IGNORECASE),
]


def extract_description(html: str) -> str | None:
    """Return the meta description value, or None if absent/empty."""
    for pat in _META_PATTERNS:
        m = pat.search(html)
        if m:
            return m.group(1).strip()
    return None


def audit(dist_dir: str) -> int:
    root = Path(dist_dir)
    if not root.is_dir():
        print(f"ERROR: {dist_dir} is not a directory", file=sys.stderr)
        return 1

    # HTML-level skip: redirect pages and explicitly noindexed pages are not crawlable content.
    SKIP_HTML_RE = re.compile(
        r'http-equiv=["\']refresh["\']|'
        r'<meta\s[^>]*name=["\']robots["\'][^>]*content=["\'][^"\']*noindex',
        re.IGNORECASE,
    )
    # Filename-level skip: Google/Bing ownership verification stubs.
    SKIP_NAME_RE = re.compile(r'google[\w-]+\.html|BingSiteAuth\.xml', re.IGNORECASE)

    html_files = sorted(root.rglob("*.html"))
    total = len(html_files)
    skipped = 0

    missing = []
    too_short = []
    too_long = []

    for path in html_files:
        if SKIP_NAME_RE.search(path.name):
            skipped += 1
            continue

        try:
            html = path.read_text(encoding="utf-8", errors="replace")
        except OSError as e:
            print(f"WARN: cannot read {path}: {e}", file=sys.stderr)
            continue

        if SKIP_HTML_RE.search(html):
            skipped += 1
            continue

        desc = extract_description(html)
        rel = str(path.relative_to(root))

        if desc is None or desc == "":
            missing.append(rel)
        elif len(desc) < MIN_LEN:
            too_short.append((rel, len(desc), desc))
        elif len(desc) > MAX_LEN:
            too_long.append((rel, len(desc), desc[:60] + "…"))

    issues = len(missing) + len(too_short) + len(too_long)

    if missing:
        print(f"\n=== MISSING meta description ({len(missing)} pages) ===")
        for p in missing:
            print(f"  MISSING  {p}")

    if too_short:
        print(f"\n=== TOO SHORT < {MIN_LEN} chars ({len(too_short)} pages) ===")
        for p, length, text in too_short:
            print(f"  SHORT({length:3d})  {p}  [{text!r}]")

    if too_long:
        print(f"\n=== TOO LONG > {MAX_LEN} chars ({len(too_long)} pages) ===")
        for p, length, text in too_long:
            print(f"  LONG({length:3d})   {p}  [{text}]")

    audited = total - skipped
    if issues == 0:
        print(
            f"PASS: all {audited} audited pages have a valid meta description "
            f"({MIN_LEN}–{MAX_LEN} chars). {skipped} non-content page(s) skipped."
        )
    else:
        print(
            f"\nSUMMARY: {issues} issue(s) across {audited} audited pages — "
            f"{len(missing)} missing, {len(too_short)} too short, {len(too_long)} too long. "
            f"({skipped} non-content page(s) skipped)"
        )

    return 0 if issues == 0 else 1


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <dist_dir>", file=sys.stderr)
        sys.exit(1)
    sys.exit(audit(sys.argv[1]))
