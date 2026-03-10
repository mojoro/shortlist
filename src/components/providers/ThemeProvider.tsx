"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { env } from "@/env";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={env.NEXT_PUBLIC_DEFAULT_THEME}
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
