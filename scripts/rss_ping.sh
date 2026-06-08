#!/bin/bash
# PubSubHubbub ping — called by deploy.sh after a successful build.
# Notifies pubsubhubbub.appspot.com that each locale RSS feed has been updated
# so feed readers and AI pipelines pull the new content immediately.

set -euo pipefail

SITE_HOST="https://softmeal.org"
HUB="https://pubsubhubbub.appspot.com/"

LOCALES=(en ja zh-cn zh-hk)

ALL_OK=true

for locale in "${LOCALES[@]}"; do
  FEED_URL="${SITE_HOST}/${locale}/rss.xml"
  echo "[rss_ping] Pinging hub for ${FEED_URL}..."
  HTTP_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" \
    -X POST "${HUB}" \
    --data-urlencode "hub.mode=publish" \
    --data-urlencode "hub.url=${FEED_URL}" || echo "000")
  echo "[rss_ping]   status: ${HTTP_STATUS}"
  if [ "${HTTP_STATUS}" = "204" ] || [ "${HTTP_STATUS}" = "200" ] || [ "${HTTP_STATUS}" = "202" ]; then
    echo "[rss_ping]   OK"
  else
    echo "[rss_ping]   WARNING: unexpected status ${HTTP_STATUS} for ${FEED_URL}"
    ALL_OK=false
  fi
done

if [ "${ALL_OK}" = true ]; then
  echo "[rss_ping] All feeds pinged successfully."
else
  echo "[rss_ping] WARNING: one or more pings returned unexpected status."
fi
