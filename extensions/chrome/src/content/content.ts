import { collectPageContent } from "../lib/extractors";
import type { Message } from "../types";

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    if (message.type === "GET_PAGE_CONTENT") {
      const content = collectPageContent();
      sendResponse({ type: "PAGE_CONTENT", content });
    }
    return true;
  },
);
