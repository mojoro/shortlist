import type { SelectorMap, RawExtraction } from "../../types";

// ── CSS framework class blocklist ────────────────────────────────────────

const FRAMEWORK_PATTERNS = [
  // Tailwind utilities
  /^-?(sm|md|lg|xl|2xl):/,
  /^(hover|focus|active|disabled|group-|peer-):/,
  /^!?-?(bg|text|font|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|w|h|min-w|min-h|max-w|max-h)-/,
  /^(flex|grid|col|row|gap|space|place|items|justify|self|order)-/,
  /^(border|rounded|shadow|ring|outline)-/,
  /^(opacity|transition|transform|duration|ease|delay|animate)-/,
  /^(absolute|relative|fixed|sticky|inset|top|right|bottom|left|z)-/,
  /^(overflow|truncate|whitespace|break|tracking|leading)-/,
  /^(block|inline-block|inline|hidden|invisible|visible|sr-only|not-sr-only)$/,
  /^(cursor|pointer-events|select|resize|appearance)-/,
  /^(underline|overline|line-through|no-underline|uppercase|lowercase|capitalize|normal-case)$/,
  /^(antialiased|subpixel-antialiased)$/,
  /^(fill|stroke)-/,
  /^(table|clear|float)-/,
  /^(accent|caret|scroll)-/,
  /^(snap|touch|will-change)-/,
  /^(columns|break-|object-|aspect-)/,
  /^(decoration|indent|align|content)-/,
  /^(backdrop|filter|blur|brightness|contrast|grayscale|invert|saturate|sepia|drop-shadow)-/,
  /^(mix-blend|bg-blend)-/,
  /^(isolate|isolation)-/,
  /^(list|placeholder)-/,
  /^(ring|divide|space)-/,
  /^(from|via|to)-/,
  /^(basis|grow|shrink)-/,
  // Bootstrap
  /^(col-|row|container|btn|nav-|card|modal|badge|alert|form-|input-)/,
  /^(d-|justify-content|align-items|float-|position-|text-center|text-start|text-end)$/,
  /^(mb-|mt-|ms-|me-|mx-|my-|pb-|pt-|ps-|pe-|px-|py-|g-|gx-|gy-)\d/,
  /^(visually-hidden|stretched-link|clearfix)$/,
  // CSS Modules / Styled Components / Emotion (hashed)
  /^(css|sc|emotion)-[a-zA-Z0-9]/,
  /^_[a-zA-Z]+_[a-f0-9]+/,
  /[a-zA-Z]+_[a-f0-9]{5,}$/,
  // Generic minified classes (1-2 chars)
  /^[a-zA-Z]{1,2}$/,
];

const KEEP_ATTRIBUTES = new Set(["id", "data-testid", "data-test", "role", "aria-label", "class"]);

const NOISE_SELECTOR =
  "script, style, nav, footer, header, iframe, noscript, svg, img, video, audio, canvas, " +
  "[aria-hidden='true'], [role='navigation'], [role='banner'], [role='contentinfo']";

const MAX_SKELETON_LENGTH = 15_000;
const MAX_TEXT_NODE_LENGTH = 30;

// ── DOM skeleton builder ─────────────────────────────────────────────────

function isFrameworkClass(cls: string): boolean {
  return FRAMEWORK_PATTERNS.some((pattern) => pattern.test(cls));
}

function stripAttributes(el: Element): void {
  const attrs = Array.from(el.attributes);
  for (const attr of attrs) {
    if (attr.name === "style") {
      el.removeAttribute("style");
      continue;
    }
    if (attr.name === "class") {
      const filtered = attr.value
        .split(/\s+/)
        .filter((cls) => cls && !isFrameworkClass(cls))
        .join(" ");
      if (filtered) {
        el.setAttribute("class", filtered);
      } else {
        el.removeAttribute("class");
      }
      continue;
    }
    if (!KEEP_ATTRIBUTES.has(attr.name)) {
      el.removeAttribute(attr.name);
    }
  }
}

function truncateTextNodes(node: Node): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    if (text.length > MAX_TEXT_NODE_LENGTH) {
      node.textContent = text.slice(0, MAX_TEXT_NODE_LENGTH) + "...";
    }
    return;
  }
  for (const child of Array.from(node.childNodes)) {
    truncateTextNodes(child);
  }
}

export function stripDomSkeleton(): string {
  const contentEl =
    document.querySelector("[role='main'] article") ??
    document.querySelector("[role='main']") ??
    document.querySelector("main") ??
    document.querySelector("article") ??
    document.body;

  const clone = contentEl.cloneNode(true) as HTMLElement;

  clone.querySelectorAll(NOISE_SELECTOR).forEach((el) => el.remove());

  const elements = clone.querySelectorAll("*");
  for (const el of elements) {
    stripAttributes(el);
  }

  truncateTextNodes(clone);

  const html = clone.outerHTML;
  return html.slice(0, MAX_SKELETON_LENGTH);
}

// ── Selector application ─────────────────────────────────────────────────

export function applySelectors(selectors: SelectorMap): RawExtraction | null {
  const query = (sel: string | null) => {
    if (!sel) return null;
    try {
      return document.querySelector(sel);
    } catch {
      return null;
    }
  };

  const textOf = (sel: string | null) => query(sel)?.textContent?.trim() ?? null;

  const title = textOf(selectors.title);
  const company = textOf(selectors.company);

  if (!title && !company) return null;

  let skillsText: string | null = null;
  if (selectors.skills) {
    const container = query(selectors.skills);
    if (container) {
      const children = container.querySelectorAll("li, span, a");
      if (children.length > 0) {
        skillsText = Array.from(children)
          .map((el) => el.textContent?.trim())
          .filter(Boolean)
          .join(", ");
      } else {
        skillsText = container.textContent?.trim() ?? null;
      }
    }
  }

  const descriptionEl = query(selectors.description);

  return {
    title,
    company,
    location: textOf(selectors.location),
    salaryText: textOf(selectors.salary),
    jobTypeText: textOf(selectors.jobType),
    skillsText,
    descriptionHtml: descriptionEl?.innerHTML ?? "",
    postedDateText: textOf(selectors.postedDate),
    url: window.location.href,
  };
}

// ── Selector caching ─────────────────────────────────────────────────────

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedSelectors {
  selectors: SelectorMap;
  cachedAt: number;
}

export async function getCachedSelectors(domain: string): Promise<SelectorMap | null> {
  const key = `selectors_${domain}`;
  const { [key]: cached } = await chrome.storage.local.get(key);
  if (!cached) return null;
  const entry = cached as CachedSelectors;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    await chrome.storage.local.remove(key);
    return null;
  }
  return entry.selectors;
}

export async function cacheSelectors(domain: string, selectors: SelectorMap): Promise<void> {
  const key = `selectors_${domain}`;
  await chrome.storage.local.set({ [key]: { selectors, cachedAt: Date.now() } });
}

export async function invalidateSelectors(domain: string): Promise<void> {
  await chrome.storage.local.remove(`selectors_${domain}`);
}
