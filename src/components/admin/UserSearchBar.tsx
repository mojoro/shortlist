"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

export function UserSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("search") ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) {
        params.set("search", next);
      } else {
        params.delete("search");
      }
      // Reset to page 1 on new search
      params.delete("page");
      router.replace(`/admin/users?${params.toString()}`);
    }, 300);
  }

  return (
    <input
      type="search"
      value={value}
      onChange={handleChange}
      placeholder="Search users by email..."
      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] sm:max-w-sm"
    />
  );
}
