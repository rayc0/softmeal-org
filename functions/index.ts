/**
 * Cloudflare Pages Function — geo-based locale routing for softmeal.org
 *
 * Routing logic (same as seniordeli.com middleware):
 *   1. Cookie `softmeal_locale` wins (user's explicit language choice)
 *   2. cf-ipcountry header:
 *      HK / MO / TW → zh-hk
 *      CN           → zh-cn
 *      JP           → ja
 *      everything else → en
 *   3. Fallback: zh-hk
 *
 * Only intercepts GET requests to "/" (root). All other paths pass through.
 */

type Env = Record<string, unknown>;

const VALID_LOCALES = ['zh-hk', 'zh-cn', 'ja', 'en'] as const;
type Locale = (typeof VALID_LOCALES)[number];

function localeFromCountry(country: string | null | undefined): Locale {
  if (!country) return 'zh-hk';
  const c = country.toUpperCase();
  if (c === 'HK' || c === 'MO' || c === 'TW') return 'zh-hk';
  if (c === 'CN') return 'zh-cn';
  if (c === 'JP') return 'ja';
  return 'en';
}

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  const url = new URL(request.url);

  // Only handle exact root path; let everything else pass through
  if (url.pathname !== '/') {
    return next();
  }

  // 1. Honour cookie preference
  const cookie = request.headers.get('cookie') ?? '';
  const cookieMatch = cookie.match(/(?:^|;\s*)softmeal_locale=([^;]+)/);
  const cookieLocale = cookieMatch?.[1];
  if (cookieLocale && (VALID_LOCALES as readonly string[]).includes(cookieLocale)) {
    const redirectUrl = new URL(`/${cookieLocale}/`, url.origin);
    return Response.redirect(redirectUrl.toString(), 302);
  }

  // 2. IP-country detection via Cloudflare header
  const country = request.headers.get('cf-ipcountry');
  const locale = localeFromCountry(country);

  const redirectUrl = new URL(`/${locale}/`, url.origin);
  const response = Response.redirect(redirectUrl.toString(), 302);
  // Tell CDN this varies by geo + cookie so it doesn't cache the wrong locale
  const mutableResponse = new Response(response.body, response);
  mutableResponse.headers.set('cache-control', 'no-store');
  mutableResponse.headers.set('vary', 'cookie, cf-ipcountry');
  return mutableResponse;
};
