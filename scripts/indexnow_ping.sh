#!/bin/bash
# IndexNow ping — called by deploy.sh after a successful build.
# Submits the full URL list from the live sitemap to Bing + Yandex via IndexNow.

set -euo pipefail

INDEXNOW_KEY="c8021457e4dcc07cb8cf066568d631f8"
SITE_HOST="https://softmeal.org"
SITEMAP_INDEX_URL="${SITE_HOST}/sitemap-index.xml"
KEY_LOCATION="${SITE_HOST}/${INDEXNOW_KEY}.txt"

ENDPOINTS=(
  "https://api.indexnow.org/indexnow"
  "https://www.bing.com/indexnow"
)

echo "[indexnow] Fetching sitemap index from ${SITEMAP_INDEX_URL}..."

# Fetch all child sitemap URLs from the index
SITEMAP_URLS=$(curl -sf "${SITEMAP_INDEX_URL}" \
  | grep -oP '(?<=<loc>)[^<]+(?=</loc>)' \
  | grep 'sitemap-' || true)

if [ -z "${SITEMAP_URLS}" ]; then
  echo "[indexnow] No child sitemaps found — falling back to index URL only"
  SITEMAP_URLS="${SITEMAP_INDEX_URL}"
fi

# Collect all page <loc> URLs from every child sitemap (deduplicated, max 10 000)
echo "[indexnow] Extracting page URLs..."
ALL_URLS=()
while IFS= read -r sm_url; do
  chunk=$(curl -sf "${sm_url}" \
    | grep -oP '(?<=<loc>)[^<]+(?=</loc>)' \
    | grep -v 'sitemap' || true)
  while IFS= read -r url; do
    ALL_URLS+=("${url}")
  done <<< "${chunk}"
done <<< "${SITEMAP_URLS}"

# Remove duplicates and cap at 10 000 (IndexNow limit per call)
mapfile -t UNIQUE_URLS < <(printf '%s\n' "${ALL_URLS[@]}" | sort -u | head -10000)

URL_COUNT="${#UNIQUE_URLS[@]}"
echo "[indexnow] Submitting ${URL_COUNT} URLs..."

if [ "${URL_COUNT}" -eq 0 ]; then
  echo "[indexnow] WARNING: no URLs found, skipping submission"
  exit 0
fi

# Build JSON array of URLs
URL_JSON=$(printf '%s\n' "${UNIQUE_URLS[@]}" | jq -R . | jq -s .)

PAYLOAD=$(jq -n \
  --arg host "softmeal.org" \
  --arg key "${INDEXNOW_KEY}" \
  --arg key_location "${KEY_LOCATION}" \
  --argjson url_list "${URL_JSON}" \
  '{host: $host, key: $key, keyLocation: $key_location, urlList: $url_list}')

for endpoint in "${ENDPOINTS[@]}"; do
  echo "[indexnow] POST → ${endpoint}"
  HTTP_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" \
    -X POST "${endpoint}" \
    -H "Content-Type: application/json; charset=utf-8" \
    -d "${PAYLOAD}" || echo "000")
  echo "[indexnow]   status: ${HTTP_STATUS}"
  if [ "${HTTP_STATUS}" = "200" ] || [ "${HTTP_STATUS}" = "202" ]; then
    echo "[indexnow]   OK"
  else
    echo "[indexnow]   WARNING: unexpected status ${HTTP_STATUS} from ${endpoint}"
  fi
done

echo "[indexnow] Done."
