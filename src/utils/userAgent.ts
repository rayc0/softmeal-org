/**
 * WeChat/LINE in-app browser detection and adaptation utilities.
 * CDO §8: WeChat blocks service workers + has sticky overflow bugs;
 * LINE needs +4px tap targets, no hover.
 */

/** Returns true only in a real browser context (not SSR). */
const isBrowser = typeof navigator !== "undefined";

export const isWeChat = (): boolean =>
  isBrowser && /MicroMessenger/i.test(navigator.userAgent);

export const isLINE = (): boolean =>
  isBrowser && /Line\//i.test(navigator.userAgent);

export const isInAppBrowser = (): boolean => isWeChat() || isLINE();

// ---------------------------------------------------------------------------
// Service worker guard
// ---------------------------------------------------------------------------

/**
 * Register a service worker only when not running inside WeChat.
 * WeChat silently blocks SW registration, causing unhandled promise rejections.
 */
export function registerServiceWorker(scriptURL: string): void {
  if (!isBrowser || isWeChat()) return;
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register(scriptURL).catch(() => {
    // Swallow registration errors in other restricted environments.
  });
}

// ---------------------------------------------------------------------------
// Sticky fallback via IntersectionObserver (WeChat)
// ---------------------------------------------------------------------------

/**
 * Replace position:sticky with an IntersectionObserver-based sticky on WeChat.
 * Pass the element that should remain "stuck" and its sentinel sibling above it.
 */
export function applyWeChatStickyFallback(
  sticky: HTMLElement,
  sentinel: HTMLElement
): (() => void) | undefined {
  if (!isWeChat()) return undefined;

  sticky.style.position = "relative";

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) {
        sticky.style.position = "fixed";
        sticky.style.top = "0";
        sticky.style.left = "0";
        sticky.style.width = "100%";
        sticky.style.zIndex = "100";
      } else {
        sticky.style.position = "relative";
        sticky.style.top = "";
        sticky.style.left = "";
        sticky.style.width = "";
        sticky.style.zIndex = "";
      }
    },
    { threshold: 0 }
  );

  observer.observe(sentinel);
  return () => observer.disconnect();
}

// ---------------------------------------------------------------------------
// LINE tap-target expansion + hover suppression
// ---------------------------------------------------------------------------

const LINE_STYLE_ID = "line-ua-overrides";

/**
 * Inject a <style> block that expands tap targets by 4 px and disables hover
 * states when running inside the LINE in-app browser.
 *
 * Safe to call multiple times; only injects once per page.
 */
export function applyLINEAdaptations(): void {
  if (!isBrowser || !isLINE()) return;
  if (document.getElementById(LINE_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = LINE_STYLE_ID;
  style.textContent = `
    /* LINE UA: expand tap targets +4px via padding compensation */
    a, button, [role="button"], input[type="checkbox"], input[type="radio"],
    label, select, summary {
      padding-block: calc(var(--tap-padding, 0px) + 4px) !important;
      padding-inline: calc(var(--tap-padding, 0px) + 4px) !important;
    }

    /* LINE UA: disable hover pseudo-class effects */
    @media (hover: hover) {
      a:hover, button:hover, [role="button"]:hover {
        background-color: unset !important;
        color: unset !important;
        opacity: unset !important;
        text-decoration: unset !important;
      }
    }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Convenience: run all adaptations for the current UA
// ---------------------------------------------------------------------------

/**
 * Call once on DOMContentLoaded to apply all relevant UA tweaks automatically.
 */
export function applyAllUAAdaptations(): void {
  applyLINEAdaptations();
  // WeChat sticky fallback is element-specific; callers use applyWeChatStickyFallback directly.
}
