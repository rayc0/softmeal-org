# Security Headers — Cloudflare Transform Rule

> **Status**: `_headers` file deployed but partially overridden by Cloudflare defaults.
> HSTS and CSP are absent from live responses. A CF Transform Rule is required to enforce all headers.

## Problem

`public/_headers` is applied by CF Pages but Cloudflare's own edge settings override some values:

| Header | `_headers` value | Live response |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | **MISSING** |
| `Content-Security-Policy` | full policy | **MISSING** |
| `X-Frame-Options` | `DENY` | `SAMEORIGIN` (CF default) |
| `Permissions-Policy` | includes `interest-cohort=()` | stripped |

**Fix**: Add a Modify Response Headers Transform Rule in the CF dashboard. Transform Rules fire after Pages and win over edge defaults.

---

## Step-by-step: Add Transform Rule

1. Cloudflare Dashboard → **softmeal.org** → **Rules** → **Transform Rules** → **Modify Response Headers**
2. Click **Create rule**
3. Name: `Security Headers`
4. **If** → Custom filter expression → `(http.host eq "softmeal.org" or http.host eq "www.softmeal.org")`
5. **Then** → Set static response headers (add each row below):

### Header values to paste

```
Strict-Transport-Security
max-age=63072000; includeSubDomains; preload
```

```
Content-Security-Policy
default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://unpkg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.careez.org https://*.seniordeli.com; connect-src 'self' https://www.seniordeli.com https://api.anthropic.com; frame-ancestors 'none';
```

```
X-Frame-Options
DENY
```

```
X-Content-Type-Options
nosniff
```

```
Referrer-Policy
strict-origin-when-cross-origin
```

```
Permissions-Policy
camera=(), microphone=(), geolocation=(), interest-cohort=()
```

```
X-Robots-Tag
index, follow
```

6. **Action** for each: **Set** (not "Add" — Set overwrites the CF default)
7. Click **Deploy**

---

## Verification

After saving the rule, run:

```bash
curl -sI https://softmeal.org/ | grep -iE "strict-transport|content-security|x-frame|permissions|referrer|x-content|x-robots"
```

Expected output should include all 7 headers.

---

## HSTS Preload

Once all 7 headers are confirmed live:

1. Wait **7 full days** with HSTS header consistently present
2. Submit at **https://hstspreload.org/?domain=softmeal.org**
3. Requirements checklist:
   - [x] `max-age` ≥ 31536000 (63072000 = 2 years ✓)
   - [x] `includeSubDomains` directive present ✓
   - [x] `preload` directive present ✓
   - [ ] All subdomains must also serve valid HTTPS (verify `www.softmeal.org` redirects to HTTPS)
   - [ ] No HTTP redirect loops

---

## CSP Notes

Current CSP allows `'unsafe-inline'` for scripts and styles — acceptable for now given Astro's inline style injection. Once the site migrates to nonce-based or hash-based CSP, remove `'unsafe-inline'` from `script-src`.

External origins currently whitelisted:
- `https://static.cloudflareinsights.com` — CF Web Analytics
- `https://unpkg.com` — any CDN dependencies
- `https://*.careez.org`, `https://*.seniordeli.com` — group brand images
- `https://api.anthropic.com` — AI feature connect calls

---

## Also: Disable CF Default Security Headers

To prevent Cloudflare from re-injecting `X-Frame-Options: SAMEORIGIN` after the Transform Rule sets `DENY`:

- Dashboard → **Security** → **Settings** → scroll to **Browser Integrity Check** / **Security Headers** — ensure "Automatic HTTPS Rewrites" and "Security Headers" toggles do not force their own values
- Or, in the Transform Rule use **Rewrite** action for `X-Frame-Options` specifically, which will take absolute precedence
