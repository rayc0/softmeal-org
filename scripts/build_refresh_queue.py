#!/usr/bin/env python3
"""
build_refresh_queue.py — COO §6 weekly refresh agent.

Lists all pages where:
  • schema_type == MedicalWebPage   (clinical drug / policy class)
  • last_modified is > 90 days before today

These pages are candidates for content refresh (fresh citations, updated
clinical guidance), after which last_modified should be bumped.

Usage:
  cd /Users/tun/Projects/softmeal-org
  python3 scripts/build_refresh_queue.py            # print to stdout
  python3 scripts/build_refresh_queue.py --save     # also write measurement/refresh_queue.md
  python3 scripts/build_refresh_queue.py --days 60  # custom staleness threshold (default: 90)

Weekly cadence (COO §6):
  Run every Monday. Pages surfaced here should be regenerated with fresh
  PubMed / WHO / HA citations before bumping last_modified in frontmatter.
  The agent that performs the refresh must:
    1. Pull the stale page list from this script (or refresh_queue.md).
    2. For each page: re-source cited claims, update citation block,
       bump last_modified to today's date in frontmatter.
    3. Commit with message: "chore(refresh): bump N stale MedicalWebPages".
  Pages that cannot be refreshed (e.g., awaiting clinical advisor sign-off)
  should be noted in measurement/refresh_queue.md under "Blocked".
"""

import re
import sys
from datetime import date, datetime, timezone, timedelta
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

CONTENT_ROOT = Path(__file__).parent.parent / "src" / "content"
REPORT_PATH  = Path(__file__).parent.parent / "measurement" / "refresh_queue.md"
LOCALES      = ["en", "ja", "zh-hk", "zh-cn"]
TARGET_SCHEMA_TYPES = {"MedicalWebPage"}
DEFAULT_STALENESS_DAYS = 90

# ---------------------------------------------------------------------------
# Frontmatter parsing (minimal, no external deps)
# ---------------------------------------------------------------------------

_FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def _parse_frontmatter(text: str) -> dict[str, str]:
    m = _FM_RE.match(text)
    if not m:
        return {}
    result: dict[str, str] = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            key, _, val = line.partition(":")
            result[key.strip()] = val.strip().strip('"').strip("'")
    return result


# ---------------------------------------------------------------------------
# Page inventory
# ---------------------------------------------------------------------------

def _iter_pages():
    """Yield (locale, filepath) for every page (not recipe)."""
    for locale in LOCALES:
        folder = CONTENT_ROOT / "pages" / locale
        if not folder.exists():
            continue
        for f in sorted(folder.glob("*.md*")):
            yield locale, f


# ---------------------------------------------------------------------------
# Main logic
# ---------------------------------------------------------------------------

def build_refresh_queue(staleness_days: int = DEFAULT_STALENESS_DAYS) -> list[dict]:
    cutoff = date.today() - timedelta(days=staleness_days)
    stale: list[dict] = []

    for locale, filepath in _iter_pages():
        try:
            text = filepath.read_text(encoding="utf-8")
        except Exception:
            continue

        fm = _parse_frontmatter(text)
        schema_type  = fm.get("schema_type", "WebPage")
        last_modified_str = fm.get("last_modified", "")

        if schema_type not in TARGET_SCHEMA_TYPES:
            continue

        try:
            last_modified = date.fromisoformat(last_modified_str)
        except ValueError:
            continue

        if last_modified <= cutoff:
            age_days = (date.today() - last_modified).days
            stale.append({
                "locale":        locale,
                "slug":          filepath.stem,
                "filepath":      str(filepath.relative_to(CONTENT_ROOT.parent.parent)),
                "last_modified": last_modified_str,
                "age_days":      age_days,
                "title":         fm.get("title", "(no title)"),
                "schema_type":   schema_type,
            })

    # Sort oldest first
    stale.sort(key=lambda p: p["age_days"], reverse=True)
    return stale


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------

def generate_report(queue: list[dict], staleness_days: int) -> str:
    ts    = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    today = date.today().isoformat()

    lines = [
        "# Refresh Queue — COO §6",
        "",
        f"**Staleness threshold**: {staleness_days} days  ",
        f"**Run date**: {today}  ",
        f"**Schema filter**: `{', '.join(sorted(TARGET_SCHEMA_TYPES))}`",
        "",
        "## Summary",
        "",
    ]

    # Per-locale counts
    by_locale: dict[str, list[dict]] = {}
    for p in queue:
        by_locale.setdefault(p["locale"], []).append(p)

    lines += [
        f"| Locale | Stale pages |",
        f"|--------|-------------|",
    ]
    for locale in LOCALES:
        n = len(by_locale.get(locale, []))
        lines.append(f"| {locale} | {n} |")
    lines += [
        f"| **Total** | **{len(queue)}** |",
        "",
    ]

    if not queue:
        lines.append("_No stale pages found. All MedicalWebPages are fresh._\n")
    else:
        lines += [
            "## Pages to refresh (oldest first)",
            "",
            "| Locale | Slug | Last modified | Age (days) | Title |",
            "|--------|------|--------------|-----------|-------|",
        ]
        for p in queue:
            title_short = p["title"][:60] + ("…" if len(p["title"]) > 60 else "")
            lines.append(
                f"| {p['locale']} | `{p['slug']}` | {p['last_modified']} "
                f"| {p['age_days']} | {title_short} |"
            )
        lines.append("")

        lines += [
            "## Refresh checklist (per page)",
            "",
            "1. Re-source cited claims against PubMed / WHO / HA guidelines.",
            "2. Update `<CitationBlock>` / sources accordion with fresh DOIs/URLs.",
            "3. Bump `last_modified` in frontmatter to today's date.",
            "4. Commit: `chore(refresh): bump <slug> last_modified`.",
            "",
            "## Blocked (manual note)",
            "",
            "_Add pages here that cannot be auto-refreshed, with reason._",
            "",
        ]

    lines.append(f"---\n*Generated {ts} by `scripts/build_refresh_queue.py`*\n")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    save         = "--save" in sys.argv
    staleness_days = DEFAULT_STALENESS_DAYS
    if "--days" in sys.argv:
        idx = sys.argv.index("--days")
        try:
            staleness_days = int(sys.argv[idx + 1])
        except (IndexError, ValueError):
            print("ERROR: --days requires an integer argument", file=sys.stderr)
            return 2

    print(f"Scanning MedicalWebPages stale > {staleness_days} days…", file=sys.stderr)
    queue = build_refresh_queue(staleness_days)

    report = generate_report(queue, staleness_days)

    if save:
        REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
        REPORT_PATH.write_text(report, encoding="utf-8")
        print(f"Report saved → {REPORT_PATH}", file=sys.stderr)

    print(report)

    # 3-line tail summary (matches verification: tail -3)
    total_scanned = sum(1 for _ in _iter_pages())
    print(f"\n=== REFRESH QUEUE COMPLETE: {len(queue)} stale MedicalWebPages (>{staleness_days}d) ===")
    print(f"    threshold:{staleness_days}d  stale:{len(queue)}  total_pages_scanned:{total_scanned}")
    print(f"    Full report: measurement/refresh_queue.md  (run with --save to write)")

    return 1 if len(queue) > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
