#!/usr/bin/env python3
"""
audit_hreflang.py — Validate hreflang alternate link tags in built HTML.

Checks:
  1. Every HTML page declares all 5 hreflang variants (zh-HK, zh-CN, ja, en, x-default).
  2. All hreflang href values are absolute and point to the expected locale prefix.
  3. Bidirectional consistency: if page A declares hreflang href B, then B must declare A back.

Usage:
  python3 scripts/audit_hreflang.py [--dist DIST_DIR]

Exit 0 = all clear, exit 1 = failures found (CI blocking).
"""

import argparse
import re
import sys
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse

SITE_BASE = "https://softmeal.org"
EXPECTED_LOCALES = {"zh-HK", "zh-CN", "ja", "en", "x-default"}
LOCALE_PREFIXES = {
    "zh-HK": "/zh-hk/",
    "zh-CN": "/zh-cn/",
    "ja": "/ja/",
    "en": "/en/",
}


class HreflangParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.alternates: dict[str, str] = {}  # hreflang -> href

    def handle_starttag(self, tag, attrs):
        if tag != "link":
            return
        attrs_dict = dict(attrs)
        if attrs_dict.get("rel") == "alternate" and "hreflang" in attrs_dict:
            lang = attrs_dict["hreflang"]
            href = attrs_dict.get("href", "")
            self.alternates[lang] = href


def parse_hreflang(html_path: Path) -> dict[str, str]:
    parser = HreflangParser()
    try:
        parser.feed(html_path.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        pass
    return parser.alternates


def href_to_path(href: str) -> str:
    """Strip site base and trailing slash to get a normalised path key."""
    path = href.replace(SITE_BASE, "").rstrip("/")
    return path or "/"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dist", nargs="?", default="dist", help="Path to built dist directory")
    ap.add_argument("--dist", dest="dist_flag", default=None, help=argparse.SUPPRESS)
    args = ap.parse_args()

    dist = Path(args.dist_flag if args.dist_flag else args.dist)
    if not dist.exists():
        print(f"ERROR: dist directory '{dist}' not found — run the build first.", file=sys.stderr)
        sys.exit(1)

    html_files = sorted(dist.rglob("index.html"))
    if not html_files:
        print("ERROR: No HTML files found in dist/", file=sys.stderr)
        sys.exit(1)

    print(f"Scanning {len(html_files)} HTML pages for hreflang tags …")

    # path_key -> {hreflang -> href}
    page_alternates: dict[str, dict[str, str]] = {}
    errors: list[str] = []

    for html_path in html_files:
        rel = html_path.relative_to(dist).parent
        # normalise: dist/zh-hk/recipes/foo/index.html -> /zh-hk/recipes/foo
        path_key = "/" + str(rel).replace("\\", "/").rstrip(".")
        if path_key == "/.":
            path_key = "/"

        alternates = parse_hreflang(html_path)

        # Skip pages with no hreflang at all (e.g. 404, redirects)
        if not alternates:
            continue

        page_alternates[path_key] = alternates

        # Check 1: all expected locales present
        missing = EXPECTED_LOCALES - set(alternates.keys())
        if missing:
            errors.append(f"{path_key}: missing hreflang locales: {sorted(missing)}")

        # Check 2: href values are absolute + have correct locale prefix
        for lang, href in alternates.items():
            if lang == "x-default":
                continue
            expected_prefix = LOCALE_PREFIXES.get(lang)
            if not expected_prefix:
                continue
            parsed = urlparse(href)
            if not parsed.scheme:
                errors.append(f"{path_key}: hreflang={lang} href is not absolute: {href!r}")
                continue
            if not parsed.path.startswith(expected_prefix):
                errors.append(
                    f"{path_key}: hreflang={lang} href path {parsed.path!r} "
                    f"does not start with {expected_prefix!r}"
                )

    # Check 3: bidirectional consistency
    # Build reverse map: href_path_key -> set of pages that reference it
    # For each page, its hreflang alternates should all reference each other back.
    href_to_page: dict[str, str] = {}
    for path_key, alternates in page_alternates.items():
        for lang, href in alternates.items():
            target_key = href_to_path(href)
            href_to_page[target_key] = path_key

    for path_key, alternates in page_alternates.items():
        for lang, href in alternates.items():
            if lang == "x-default":
                continue
            target_key = href_to_path(href)
            if target_key == path_key:
                continue
            if target_key not in page_alternates:
                # Target page doesn't exist in build — dead hreflang ref
                errors.append(
                    f"{path_key}: hreflang={lang} points to {target_key!r} "
                    f"which has no index.html in dist/"
                )
                continue
            # Target page should link back to this page
            target_alternates = page_alternates[target_key]
            found_back = any(
                href_to_path(h) == path_key for h in target_alternates.values()
            )
            if not found_back:
                errors.append(
                    f"{path_key}: hreflang={lang} → {target_key!r} "
                    f"but {target_key!r} does not link back"
                )

    if errors:
        print(f"\n❌ hreflang audit FAILED — {len(errors)} issue(s):\n")
        for e in errors:
            print(f"  • {e}")
        sys.exit(1)
    else:
        print(f"✅ hreflang audit passed — {len(page_alternates)} pages checked, no issues.")
        sys.exit(0)


if __name__ == "__main__":
    main()
