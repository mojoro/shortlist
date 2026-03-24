import { extractFromPage } from "../lib/extractors";
import type { Message } from "../types";

/**
 * Content script — injected on demand via chrome.scripting.executeScript
 * when the user opens the popup, or pre-injected on known job board URLs.
 *
 * Listens for EXTRACT messages from the popup and returns extraction results.
 */

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
    return true;
  },
);
