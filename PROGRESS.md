# softmeal-org — Progress

<!-- This file is the AI-facing progress ledger. Claude updates it at the END of
     every dev session in this repo. The portfolio dashboard reads the fields below.
     Keep it short. Git activity (last commit) is detected automatically. -->

Updated: 2026-05-31
Health: 🟢 on track
Percent: 62
One-liner: Dysphagia/care-food encyclopedia at softmeal.org — Astro, 4-locale (zh-HK/zh-CN/ja/en), 1,845+ content files (901 pages + 864 recipes), 176 commits; M3 active — solidifying content authority ahead of seniordeli.com DNS cutover.

## Next action
- Start ZH locale parity backfill: 241 EN articles are git-tracked vs 246 zh-HK / 251 zh-CN — 14 unstaged new EN articles (in working tree, not yet committed) need ZH-HK + ZH-CN equivalents; target: batch-generate 20 ZH-HK + 20 ZH-CN articles matching those EN slugs and commit as a single content sprint

## This week
- [ ] Audit which of the 14 untracked EN article stubs (e.g. aspiration-pneumonia-diet-guide, dysphagia-diet-complete-guide, iddsi-levels-explained-guide, thickener-for-swallowing-guide) have ZH counterparts — create a parity gap map
- [ ] Backfill 20 ZH-HK articles to close EN→ZH-HK gap on high-traffic IDDSI + dysphagia queries
- [ ] Backfill 20 ZH-CN articles matching same slugs (GBA mainland search motion)
- [ ] Define cross-hub internal linking strategy: softmeal.org ↔ dysphagia-knowledge-hub ↔ seniordeli-website (no systematic linking exists yet — define anchor templates before ZH backfill sprint so new articles include correct outbound links)
- [ ] Stage and commit the 37 modified working-tree files (package.json / layouts / pages / components) that are currently unstaged

## Blockers (needs Raymond)
- Social enterprise footer copy: confirm exact Carewells entity name + HKCSS SEE Mark or 社聯 listing status before updating all hub page footers
- ZH backfill timing decision (open strategic Q3 in ROADMAP): sprint now vs defer until post-DNS-cutover organic baseline is established?
