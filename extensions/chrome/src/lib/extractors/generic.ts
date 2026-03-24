const MAX_CONTENT_LENGTH = 50_000;

export function collectPageContent(): { url: string; html: string; title: string } {
  const contentEl =
    document.querySelector("[role='main'] article") ??
    document.querySelector("[role='main']") ??
    document.querySelector("main") ??
    document.querySelector("article") ??
    document.body;

  const clone = contentEl.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(
    "script, style, nav, footer, header, iframe, noscript, " +
    "svg, img, video, audio, canvas, " +
    "[role='navigation'], [role='banner'], [role='contentinfo'], " +
    "[aria-hidden='true']"
  ).forEach((el) => el.remove());

  return {
    url: window.location.href,
    html: clone.innerHTML.slice(0, MAX_CONTENT_LENGTH),
    title: document.title,
  };
}
