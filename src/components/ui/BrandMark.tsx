interface BrandMarkProps {
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS = {
  sm: "h-5 w-5",
  md: "h-7 w-7",
  lg: "h-8 w-8",
} as const;

export function BrandMark({ size = "md" }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={`shrink-0 ${SIZE_CLASS[size]}`}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="7" style={{ fill: "var(--accent)" }} />
      <path
        d="M8 17L13 22L24 10"
        style={{ stroke: "var(--accent-fg)", fill: "none" }}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
