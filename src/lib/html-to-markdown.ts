import TurndownService from "turndown";

/**
 * Pre-configured TurndownService instance for converting HTML to Markdown.
 * Shared across normalize.ts and jobs/extract route.
 */
const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });

export { td };
