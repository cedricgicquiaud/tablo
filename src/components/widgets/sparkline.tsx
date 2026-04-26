type Props = {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  strokeWidth?: number;
};

export function Sparkline({
  data,
  width = 100,
  height = 28,
  color = "currentColor",
  fill = true,
  strokeWidth = 1.5,
}: Props) {
  if (data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const points = data.map((v, i) => [
    i * step,
    height - ((v - min) / range) * height * 0.85 - height * 0.075,
  ] as [number, number]);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ");
  const dFill = `${d} L ${width},${height} L 0,${height} Z`;
  return (
    <svg
      width={width}
      height={height}
      style={{ display: "block", overflow: "visible" }}
      aria-hidden
    >
      {fill && <path d={dFill} fill={color} opacity="0.12" />}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
