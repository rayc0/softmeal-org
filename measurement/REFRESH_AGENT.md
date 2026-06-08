# Softmeal Refresh Agent — Weekly Cadence (COO §6)

## Purpose

Keep all `MedicalWebPage`-class content accurate and authoritative by
re-sourcing clinical / policy pages that have not been updated in over 90 days.

## Schedule

| Step | When | Who |
|------|------|-----|
| Build queue | Every **Monday 08:00 HKT** | CI / agent |
| Refresh stale pages | Monday–Wednesday | Sonnet agent |
| Advisor sign-off (if flagged) | By Thursday | Clinical advisor |
| Commit & deploy | Friday | CI |

## How to run

```bash
# Print stale MedicalWebPages (>90d) to stdout
cd /Users/tun/Projects/softmeal-org
python3 scripts/build_refresh_queue.py

# Also write measurement/refresh_queue.md
python3 scripts/build_refresh_queue.py --save

# Custom threshold (e.g. 60 days)
python3 scripts/build_refresh_queue.py --save --days 60
```

## Refresh procedure (per page)

1. **Identify stale claims** — read the page; note every factual claim that
   cites a source older than 12 months or has no citation.
2. **Re-source** — search PubMed, WHO guidelines, Hong Kong HA circulars,
   IDDSI framework documents for current evidence.
3. **Update citation block** — edit the `<CitationBlock>` / sources accordion
   in the MDX file with fresh DOIs, URLs, and access dates.
4. **Bump `last_modified`** — set to today's ISO date in frontmatter.
5. **Commit** — `chore(refresh): bump <slug> last_modified (COO §6)`.

## Quality gates

- Each refreshed page must retain its `schema_type: MedicalWebPage` field.
- Citation DOIs must resolve (check with `curl -sI <doi-url>`).
- No reduction in word count > 10 % without a noted reason.
- Pages requiring clinical advisor sign-off must be listed in the
  **Blocked** section of `measurement/refresh_queue.md` until approved.

## Agent brief (for automated execution)

```
You are the softmeal refresh agent (COO §6).
1. Run: python3 scripts/build_refresh_queue.py --save
2. Read measurement/refresh_queue.md for the stale page list.
3. For each page in the list (oldest first):
   a. Read the MDX file.
   b. Re-source all factual claims; update <CitationBlock>.
   c. Bump last_modified in frontmatter to today's date (YYYY-MM-DD).
   d. Write the file back.
4. Run: python3 scripts/build_refresh_queue.py --save  (verify queue shrinks)
5. Commit: chore(refresh): bump N stale MedicalWebPages (COO §6)
If a page requires clinical advisor review, add it to the Blocked section
in measurement/refresh_queue.md and skip it.
```

## Schema classes covered

| Class | Staleness trigger |
|-------|-----------------|
| `MedicalWebPage` | > 90 days since `last_modified` |

To extend to other schema types, add them to `TARGET_SCHEMA_TYPES` in
`scripts/build_refresh_queue.py`.

---
*Spec written 2026-05-26. Governed by COO §6 (weekly refresh agent).*
