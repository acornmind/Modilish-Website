// Small inline trend line for a KPI tile — docs/admin-spec.md §4.1
// ("Each tile shows the delta ... and a small sparkline").
export default function Sparkline({
  points,
  positive,
  width = 56,
  height = 20,
}: {
  points: number[];
  positive: boolean;
  width?: number;
  height?: number;
}) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p - min) / span) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const color = positive ? "var(--color-modi-success)" : "var(--color-modi-danger)";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0">
      <polyline points={coords.join(" ")} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
