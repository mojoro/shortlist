const MAX_HTML_LENGTH = 10_000;

/**
 * Generic fallback: collects page metadata and cleaned body text
 * for AI extraction on the server side.
 */
export function collectPageContent(): {
  url: string;
  html: string;
  title: string;
  meta: Record<string, string>;
} {
  // Collect useful meta tags
  const meta: Record<string, string> = {};
  document.querySelectorAll("meta[property], meta[name]").forEach((el) => {
    const key =
      el.getAttribute("property") ?? el.getAttribute("name") ?? "";
    const value = el.getAttribute("content") ?? "";
    if (key && value) meta[key] = value;
  });

  // Get the main content area, or fall back to body
  const mainEl =
    document.querySelector("main") ??
    document.querySelector("article") ??
    document.querySelector("[role='main']") ??
    document.body;

  // Strip scripts, styles, navs, footers to reduce noise
  const clone = mainEl.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll("script, style, nav, footer, header, iframe, noscript")
    .forEach((el) => el.remove());

  return {
    url: window.location.href,
    html: clone.innerText.slice(0, MAX_HTML_LENGTH),
    title: document.title,
    meta,
  };
}
