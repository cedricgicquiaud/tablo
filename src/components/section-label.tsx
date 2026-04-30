/**
 * Section divider à la Tablo : label mono uppercase + ligne ticks + libellé droit optionnel.
 * Inspiré de Tablo Design System/screens/03-dashboard.jsx (composant SectionLabel inline).
 */
export function SectionLabel({
  label,
  right,
  className,
}: {
  label: string;
  right?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3.5 ${className ?? ""}`}
      style={{ margin: "18px 0 12px" }}
    >
      <div
        className="font-mono uppercase text-[10.5px] tracking-[0.14em]"
        style={{ color: "var(--ink-3)" }}
      >
        {label}
      </div>
      <div
        data-tablo-ticks="true"
        className="relative flex-1"
        style={{ height: 1, background: "var(--line)" }}
      >
        {/* ticks all 5%, visible every 20% (i%4===0) */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(i + 1) * 5}%`,
              top: -2,
              width: 1,
              height: 5,
              background: i % 4 === 0 ? "var(--line-2)" : "transparent",
            }}
          />
        ))}
      </div>
      {right && (
        <div
          className="font-mono text-[10.5px] tracking-[0.08em]"
          style={{ color: "var(--ink-3)" }}
        >
          {right}
        </div>
      )}
    </div>
  );
}
