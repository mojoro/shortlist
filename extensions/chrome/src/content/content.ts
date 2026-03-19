import { extractFromPage } from "../lib/extractors";
import type { Message } from "../types";

/**
 * Content script — injected into job board pages.
 *
 * Responsibilities:
 * 1. Detect supported job pages and notify the background worker (badge).
 * 2. On request from the popup, extract job data from the DOM.
 */

// Notify the background worker that this page may be a job listing.
// The worker uses this to set the toolbar badge.
chrome.runtime.sendMessage({ type: "JOB_PAGE_DETECTED" });

// Listen for extraction requests from the popup
chrome.runtime.onMessage.addListener(
  (
    message: Message,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: Message) => void,
  ) => {
    if (message.type === "EXTRACT") {
      const result = extractFromPage();
      sendResponse({ type: "EXTRACTED", result });
    }
    // Return true to keep the message channel open for async sendResponse
    return true;
  },
);
