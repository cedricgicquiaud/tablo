type IconName = "revenue" | "users" | "cart" | "trend" | "more";

const PATHS: Record<IconName, React.ReactNode> = {
  revenue: (
    <>
      <path d="M3 6h14v10H3z M3 9h14" />
      <circle cx="10" cy="12.5" r="1.5" />
    </>
  ),
  users: (
    <>
      <circle cx="7" cy="7" r="3" />
      <path d="M2 17c0-3 2-5 5-5s5 2 5 5 M13 9a3 3 0 100-6 M13 17c0-2 1-4 3-4" />
    </>
  ),
  cart: (
    <>
      <path d="M2 3h2l2 10h10l2-7H6" />
      <circle cx="8" cy="16" r="1" />
      <circle cx="14" cy="16" r="1" />
    </>
  ),
  trend: (
    <>
      <path d="M2 14l5-5 3 3 7-7 M13 5h4v4" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="10" r="1" />
      <circle cx="10" cy="10" r="1" />
      <circle cx="15" cy="10" r="1" />
    </>
  ),
};

export function Icon({ name, size = 14 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
