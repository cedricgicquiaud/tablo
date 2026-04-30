/**
 * Wordmark "tablo" du Tablo Design System.
 * - Texte mono 700, soulignement plein, terminator block accent à droite.
 * - Couleur ink = `currentColor` (hérite du parent), terminator = var(--accent).
 *
 * Source visuelle : "Tablo Design System/uploads/.../11.38.55.png" (ref logo).
 */
type Size = "sm" | "md" | "lg";

const SIZE_MAP: Record<Size, { fontSize: number; underline: number; gap: number }> = {
  sm: { fontSize: 14, underline: 1.25, gap: 3 },
  md: { fontSize: 18, underline: 1.5, gap: 4 },
  lg: { fontSize: 28, underline: 2, gap: 5 },
};

export function TabloWordmark({
  size = "md",
  className,
}: {
  size?: Size;
  className?: string;
}) {
  const { fontSize, underline, gap } = SIZE_MAP[size];
  // Largeur approximative du texte « tablo » à cette police mono 700.
  // 5 caractères × ~0.6em ≈ 3em ; on ajoute un peu pour le terminator.
  const charWidth = fontSize * 0.62;
  const textWidth = charWidth * 5;
  const terminatorW = charWidth * 0.7;
  const terminatorH = underline * 2;
  const totalW = textWidth + terminatorW + 6;
  const totalH = fontSize + gap + terminatorH + 2;

  return (
    <svg
      width={totalW}
      height={totalH}
      viewBox={`0 0 ${totalW} ${totalH}`}
      role="img"
      aria-label="tablo"
      className={className}
      style={{ display: "block" }}
    >
      <text
        x={0}
        y={fontSize}
        fontFamily='"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace'
        fontWeight={700}
        fontSize={fontSize}
        fill="currentColor"
        letterSpacing="-0.02em"
        style={{ dominantBaseline: "alphabetic" }}
      >
        tablo
      </text>
      {/* underline rule */}
      <rect
        x={0}
        y={fontSize + gap}
        width={textWidth}
        height={underline}
        fill="currentColor"
      />
      {/* terminator block — accent */}
      <rect
        data-tablo-terminator="true"
        x={textWidth + 4}
        y={fontSize + gap}
        width={terminatorW}
        height={terminatorH}
        fill="var(--accent)"
      />
    </svg>
  );
}
