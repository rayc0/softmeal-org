#!/usr/bin/env python3
"""
Google Indexing API ping — called by deploy.sh after a successful build.
Notifies Google of updated/published URLs via the Indexing API using a
service account.  Officially designed for JobPosting/BroadcastEvent but
widely accepted for articles.

Usage:
    python3 scripts/google_indexing_ping.py [URL [URL ...]]

If no URLs are provided, fetches all URLs from the live sitemap and submits
every one.  Pass specific URLs to do a targeted ping (e.g. after an article
update).

Service account key: ~/.config/gsa-keys/gsc-api-bot-claude-email-490308.json
Required IAM permission: the service account must be an owner of the Google
Search Console property for softmeal.org.
"""

import json
import os
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("ERROR: 'requests' not installed — run: pip3 install requests")

try:
    from google.oauth2 import service_account
    import google.auth.transport.requests as google_requests
except ImportError:
    sys.exit("ERROR: 'google-auth' not installed — run: pip3 install google-auth")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

KEY_PATH = Path.home() / ".config" / "gsa-keys" / "gsc-api-bot-claude-email-490308.json"
SCOPES = ["https://www.googleapis.com/auth/indexing"]
INDEXING_API = "https://indexing.googleapis.com/v3/urlNotifications:publish"
SITE_HOST = "https://softmeal.org"
SITEMAP_INDEX_URL = f"{SITE_HOST}/sitemap-index.xml"

# Google rate-limit: 200 req/day on free tier, batch to be safe
BATCH_DELAY_SEC = 0.2


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_access_token() -> str:
    creds = service_account.Credentials.from_service_account_file(
        str(KEY_PATH), scopes=SCOPES
    )
    auth_req = google_requests.Request()
    creds.refresh(auth_req)
    return creds.token


def fetch_sitemap_urls(sitemap_url: str) -> list[str]:
    """Recursively collect all <loc> page URLs from a sitemap or sitemap index."""
    try:
        resp = requests.get(sitemap_url, timeout=15)
        resp.raise_for_status()
    except requests.RequestException as exc:
        print(f"[google-indexing] WARNING: could not fetch {sitemap_url}: {exc}")
        return []

    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    root = ET.fromstring(resp.text)

    # Sitemap index → recurse into child sitemaps
    child_sitemaps = root.findall(".//sm:sitemap/sm:loc", ns)
    if child_sitemaps:
        urls: list[str] = []
        for sm in child_sitemaps:
            urls.extend(fetch_sitemap_urls(sm.text.strip()))
        return urls

    # Regular sitemap → return page locs
    return [loc.text.strip() for loc in root.findall(".//sm:url/sm:loc", ns)]


def ping_url(url: str, token: str) -> int:
    payload = {"url": url, "type": "URL_UPDATED"}
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    try:
        resp = requests.post(INDEXING_API, json=payload, headers=headers, timeout=15)
        return resp.status_code
    except requests.RequestException as exc:
        print(f"[google-indexing]   ERROR: {exc}")
        return 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    if not KEY_PATH.exists():
        print(f"[google-indexing] ERROR: service account key not found at {KEY_PATH}")
        sys.exit(1)

    # Collect URLs
    if len(sys.argv) > 1:
        urls = sys.argv[1:]
        print(f"[google-indexing] Pinging {len(urls)} explicit URL(s)...")
    else:
        print(f"[google-indexing] Fetching sitemap from {SITEMAP_INDEX_URL}...")
        urls = list(dict.fromkeys(fetch_sitemap_urls(SITEMAP_INDEX_URL)))  # deduplicate, preserve order
        print(f"[google-indexing] Found {len(urls)} URLs in sitemap")

    if not urls:
        print("[google-indexing] WARNING: no URLs to submit, exiting")
        sys.exit(0)

    print("[google-indexing] Obtaining access token...")
    try:
        token = get_access_token()
    except Exception as exc:
        print(f"[google-indexing] ERROR: could not get access token: {exc}")
        sys.exit(1)

    ok = 0
    fail = 0
    for i, url in enumerate(urls, 1):
        status = ping_url(url, token)
        tag = "OK" if status in (200, 202) else f"FAIL({status})"
        print(f"[google-indexing]   [{i}/{len(urls)}] {tag}  {url}")
        if status in (200, 202):
            ok += 1
        else:
            fail += 1
        if i < len(urls):
            time.sleep(BATCH_DELAY_SEC)

    print(f"[google-indexing] Done. {ok} succeeded, {fail} failed.")
    if fail > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
