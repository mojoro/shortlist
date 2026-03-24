const MAX_CONTENT_LENGTH = 50_000;

/**
 * Generic fallback: collects cleaned page HTML and metadata for
 * AI extraction on the server side. Sends innerHTML so the server
 * can use Turndown to convert to clean markdown for the AI.
 */
export function collectPageContent(): {
  url: string;
  html: string;
  title: string;
  meta: Record<string, string>;
} {
  const meta: Record<string, string> = {};
  document.querySelectorAll("meta[property], meta[name]").forEach((el) => {
    const key =
      el.getAttribute("property") ?? el.getAttribute("name") ?? "";
    const value = el.getAttribute("content") ?? "";
    if (key && value) meta[key] = value;
  });

  // Try job-specific containers first, then general content areas
  const contentEl =
    document.querySelector("[role='main'] article") ??
    document.querySelector("[role='main']") ??
    document.querySelector("main article") ??
    document.querySelector("main") ??
    document.querySelector("article") ??
    document.body;

  const clone = contentEl.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll(
      "script, style, nav, footer, header, iframe, noscript, " +
      "svg, img, video, audio, canvas, " +
      "[role='navigation'], [role='banner'], [role='contentinfo'], " +
      "[aria-hidden='true']"
    )
    .forEach((el) => el.remove());

  return {
    url: window.location.href,
    html: clone.innerHTML.slice(0, MAX_CONTENT_LENGTH),
    title: document.title,
    meta,
  };
}
