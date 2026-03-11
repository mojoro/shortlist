"use client";

export type MobileTab = "jd" | "editor" | "preview";

interface MobileTabBarProps {
  activeTab: MobileTab;
  hasResume: boolean;
  onChange: (tab: MobileTab) => void;
}

export function MobileTabBar({ activeTab, hasResume, onChange }: MobileTabBarProps) {
  const tabs: Array<{ id: MobileTab; label: string }> = [
    { id: "jd", label: "Job" },
    { id: "editor", label: "Resume" },
    { id: "preview", label: "Preview" },
  ];

  return (
    <div className="flex border-b border-[var(--border)] bg-[var(--bg-card)]">
      {tabs.map((tab) => {
        const isDisabled = tab.id === "preview" && !hasResume;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => !isDisabled && onChange(tab.id)}
            disabled={isDisabled}
            className={`flex-1 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] ${
              isActive
                ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                : isDisabled
                ? "text-[var(--text-muted)] opacity-40"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
