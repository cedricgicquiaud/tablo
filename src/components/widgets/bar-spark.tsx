type Props = {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  highlightLast?: boolean;
};

export function BarSpark({
  data,
  width = 100,
  height = 28,
  color = "currentColor",
  highlightLast = false,
}: Props) {
  if (data.length === 0) return null;
  const max = Math.max(...data) || 1;
  const bw = (width / data.length) * 0.6;
  const gap = (width / data.length) * 0.4;
  return (
    <svg width={width} height={height} style={{ display: "block" }} aria-hidden>
      {data.map((v, i) => {
        const h = (v / max) * height * 0.95;
        const x = i * (bw + gap);
        const isLast = i === data.length - 1;
        return (
          <rect
            key={i}
            x={x}
            y={height - h}
            width={bw}
            height={h}
            rx={1.5}
            fill={color}
            opacity={highlightLast && !isLast ? 0.25 : 1}
          />
        );
      })}
    </svg>
  );
}
