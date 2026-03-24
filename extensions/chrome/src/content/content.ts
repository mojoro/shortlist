import { extractFromPage } from "../lib/extractors";
import { applySelectors, cacheSelectors } from "../lib/extractors/generic";
import type { Message } from "../types";

chrome.runtime.onMessage.addListener(
  (
    message: Message,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: Message) => void,
  ) => {
    if (message.type === "EXTRACT") {
      extractFromPage().then((result) => {
        sendResponse({ type: "EXTRACTED", result });
      });
      return true;
    }
    if (message.type === "APPLY_SELECTORS") {
      const raw = applySelectors(message.selectors);
      if (raw) {
        const domain = window.location.hostname;
        cacheSelectors(domain, message.selectors);
      }
      sendResponse({
        type: "SELECTORS_APPLIED",
        result: raw ? { type: "extracted", raw } : { type: "none" },
      });
      return true;
    }
  },
);
