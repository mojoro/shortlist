// src/config/app.ts
// The app name lives here and ONLY here. Import APP_CONFIG.name everywhere.
// Never write the string "Shortlist" directly outside this file.
export const APP_CONFIG = {
  name: "Shortlist",
  tagline: "Your AI-powered job search, end to end.",
  url: "https://shortlist.johnmoorman.com", // update when domain is confirmed
} as const;
