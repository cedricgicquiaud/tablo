/**
 * Layout `/app/settings/*` — wrapper container.
 * L'auth + la sidebar sont déjà héritées du layout `/app`.
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="flex flex-1 flex-col">{children}</main>;
}
