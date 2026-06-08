#!/bin/bash
# Baidu 主动推送 (active push) — called by deploy.sh after a successful build.
# POSTs zh-cn URLs to Baidu's active-push endpoint so they are crawled promptly.
#
# Requires: BAIDU_PUSH_TOKEN env var (obtain after completing Baidu Search Console
# verification at ziyuan.baidu.com — see task 033 baidu_zhanzhang_submit).
#
# Baidu limits: max 2 000 URLs/day; up to 2 000 URLs per POST body.
# Endpoint: http://data.zz.baidu.com/urls?site=softmeal.org&token=<token>

set -euo pipefail

SITE="softmeal.org"
SITE_HOST="https://softmeal.org"
SITEMAP_INDEX_URL="${SITE_HOST}/sitemap-index.xml"
BAIDU_ENDPOINT="http://data.zz.baidu.com/urls?site=${SITE}&token="
MAX_URLS=2000

if [ -z "${BAIDU_PUSH_TOKEN:-}" ]; then
  echo "[baidu_push] BAIDU_PUSH_TOKEN not set — skipping (set token once Baidu verification is complete)"
  exit 0
fi

ENDPOINT="${BAIDU_ENDPOINT}${BAIDU_PUSH_TOKEN}"

echo "[baidu_push] Fetching sitemap index from ${SITEMAP_INDEX_URL}..."

SITEMAP_URLS=$(curl -sf "${SITEMAP_INDEX_URL}" \
  | grep -oP '(?<=<loc>)[^<]+(?=</loc>)' \
  | grep 'sitemap-' || true)

if [ -z "${SITEMAP_URLS}" ]; then
  echo "[baidu_push] No child sitemaps found — aborting"
  exit 1
fi

echo "[baidu_push] Extracting zh-cn URLs..."
ALL_URLS=()
while IFS= read -r sm_url; do
  chunk=$(curl -sf "${sm_url}" \
    | grep -oP '(?<=<loc>)[^<]+(?=</loc>)' \
    | grep -v 'sitemap' \
    | grep '/zh-cn/' || true)
  while IFS= read -r url; do
    [ -n "${url}" ] && ALL_URLS+=("${url}")
  done <<< "${chunk}"
done <<< "${SITEMAP_URLS}"

mapfile -t UNIQUE_URLS < <(printf '%s\n' "${ALL_URLS[@]}" | sort -u | head -"${MAX_URLS}")

URL_COUNT="${#UNIQUE_URLS[@]}"
echo "[baidu_push] Submitting ${URL_COUNT} zh-cn URLs to Baidu active push..."

if [ "${URL_COUNT}" -eq 0 ]; then
  echo "[baidu_push] WARNING: no zh-cn URLs found, skipping submission"
  exit 0
fi

PAYLOAD=$(printf '%s\n' "${UNIQUE_URLS[@]}")

HTTP_STATUS=$(echo "${PAYLOAD}" | curl -sf -o /tmp/baidu_push_response.json -w "%{http_code}" \
  -X POST "${ENDPOINT}" \
  -H "Content-Type: text/plain" \
  --data-binary @- || echo "000")

echo "[baidu_push] HTTP status: ${HTTP_STATUS}"

if [ -f /tmp/baidu_push_response.json ]; then
  echo "[baidu_push] Response: $(cat /tmp/baidu_push_response.json)"
  rm -f /tmp/baidu_push_response.json
fi

if [ "${HTTP_STATUS}" = "200" ]; then
  echo "[baidu_push] Done — ${URL_COUNT} URLs submitted."
else
  echo "[baidu_push] WARNING: unexpected HTTP status ${HTTP_STATUS} from Baidu active push"
  exit 1
fi
