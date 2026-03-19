# Shortlist Chrome Extension

Import job listings into your Shortlist feed with one click while browsing any job board.

## Features

- **Greenhouse & Lever extractors** -- structured DOM extraction on supported job boards
- **Generic fallback** -- collects page content for AI extraction on any other site
- **One-click import** -- sends extracted data to the Shortlist API via your existing session
- **Profile selector** -- choose which search profile to import into

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm (or npm)
- A running Shortlist app (for API calls)

### Install dependencies

```bash
cd extensions/chrome
npm install
```

### Generate icons

The `icons/` directory contains SVG source files. Chrome requires PNG icons. Convert them before loading:

```bash
# Using ImageMagick (or any SVG-to-PNG tool)
convert icons/icon16.svg icons/icon16.png
convert icons/icon48.svg icons/icon48.png
convert icons/icon128.svg icons/icon128.png
```

Or use an online converter. The PNGs must be exactly 16x16, 48x48, and 128x128 pixels.

### Build

```bash
npm run build
```

### Development mode (with hot reload)

```bash
npm run dev
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `extensions/chrome/dist` directory
5. The Shortlist icon appears in your toolbar

### API base URL

By default the extension talks to `https://shortlist.johnmoorman.com`. For local development, open the extension's background page console and run:

```js
chrome.storage.local.set({ apiBaseUrl: "http://localhost:3001" });
```

To reset back to production:

```js
chrome.storage.local.remove("apiBaseUrl");
```

## Architecture

```
src/
  manifest.json           Manifest V3 configuration
  popup/
    popup.html            Popup entry HTML
    popup.tsx             React popup UI
    popup.css             Popup styles
  background/
    service-worker.ts     Background script -- coordinates API calls
  content/
    content.ts            Content script -- extracts page data
  lib/
    api.ts                Shortlist API client (fetch + Clerk cookies)
    extractors/
      index.ts            Extractor registry
      greenhouse.ts       Greenhouse job page extractor
      lever.ts            Lever job page extractor
      generic.ts          Generic fallback (page text for AI extraction)
      utils.ts            Shared extraction utilities
  types.ts                Shared TypeScript types
```

### Message flow

1. Content script detects a job page and notifies the background worker (badge)
2. User clicks the extension icon, popup opens
3. Popup asks the background worker to check auth and fetch profiles
4. Popup asks the content script to extract job data from the DOM
5. User clicks "Import" -- popup tells the background worker to call the API
6. Background worker posts to `/api/jobs/import` (or `/api/jobs/extract` for generic pages)
7. Popup shows success/error

### Authentication

The extension uses Clerk session cookies -- no API keys needed. The user must be signed in to Shortlist in at least one browser tab. The background service worker makes `fetch()` calls with `credentials: "include"` to attach cookies automatically.

## Supported Sites

| Site | Extractor | Status |
|------|-----------|--------|
| Greenhouse (`boards.greenhouse.io`, `jobs.greenhouse.io`) | Structured | MVP |
| Lever (`jobs.lever.co`) | Structured | MVP |
| Any other page | Generic (AI extraction) | MVP |
