import type { ShipmentHubStats } from "@/lib/queries/commerce";

// Coordonnées approximatives sur viewBox 100×80 (carte stylisée).
const HUB_COORDS: Record<string, [number, number]> = {
  paris: [50, 22],
  lille: [50, 12],
  strasbourg: [72, 24],
  lyon: [56, 45],
  bordeaux: [33, 53],
  marseille: [60, 65],
};

const HUB_LABELS: Record<string, string> = {
  paris: "Paris",
  lyon: "Lyon",
  marseille: "Marseille",
  bordeaux: "Bordeaux",
  lille: "Lille",
  strasbourg: "Strasbourg",
};

export function MapWidget({ data }: { data: ShipmentHubStats[] }) {
  const totalShipments = data.reduce((acc, h) => acc + h.total, 0);
  const totalInTransit = data.reduce((acc, h) => acc + h.inTransit, 0);
  const maxTotal = Math.max(...data.map((h) => h.total), 1);

  return (
    <div className="w">
      <div className="w-head">
        <div>
          <div className="w-title" style={{ fontSize: 15, color: "var(--ink)" }}>
            Expéditions actives
          </div>
          <div className="muted mt-1">
            {totalShipments} colis · {data.length} hubs
          </div>
        </div>
      </div>
      <div className="relative">
        <svg
          viewBox="0 0 100 80"
          className="w-full"
          style={{ aspectRatio: "100 / 80" }}
        >
          <defs>
            <pattern
              id="map-grid"
              x="0"
              y="0"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 8 0 L 0 0 0 8"
                fill="none"
                stroke="var(--line)"
                strokeWidth="0.2"
              />
            </pattern>
          </defs>
          <rect width="100" height="80" fill="url(#map-grid)" opacity="0.5" />
          <path
            d="M 30 18 Q 40 10 55 14 T 75 22 Q 80 35 75 50 T 60 65 Q 45 70 35 58 T 28 38 Z"
            fill="var(--surface-2)"
            stroke="var(--line-2)"
            strokeWidth="0.4"
            opacity="0.7"
          />
          {data
            .filter((h) => h.total > 0)
            .map((hub) => {
              const coord = HUB_COORDS[hub.hub] ?? [50, 40];
              const radius = 1 + (hub.total / maxTotal) * 4;
              return (
                <g key={hub.hub}>
                  {hub.hub !== "paris" ? (
                    <line
                      x1={HUB_COORDS.paris[0]}
                      y1={HUB_COORDS.paris[1]}
                      x2={coord[0]}
                      y2={coord[1]}
                      stroke="var(--accent)"
                      strokeWidth="0.3"
                      strokeDasharray="1,1"
                      opacity="0.5"
                    />
                  ) : null}
                  <circle
                    cx={coord[0]}
                    cy={coord[1]}
                    r={radius * 1.5}
                    fill="var(--accent)"
                    opacity="0.25"
                  />
                  <circle
                    cx={coord[0]}
                    cy={coord[1]}
                    r={radius}
                    fill="var(--accent)"
                  />
                </g>
              );
            })}
        </svg>
        <div
          className="absolute left-2 top-2 rounded-full border border-[var(--line)] px-2 py-1 text-[10px] text-[var(--ink-2)]"
          style={{
            background: "var(--surface)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {totalShipments} colis
        </div>
        {totalInTransit > 0 ? (
          <div
            className="absolute right-2 bottom-2 flex items-center gap-1.5 rounded-full border border-[var(--line)] px-2 py-1 text-[10px] text-[var(--ink-2)]"
            style={{ background: "var(--surface)" }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inset-0 animate-ping rounded-full opacity-75"
                style={{ background: "var(--accent)" }}
              />
              <span
                className="relative h-2 w-2 rounded-full"
                style={{ background: "var(--accent)" }}
              />
            </span>
            En transit · {totalInTransit}
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
        {data
          .filter((h) => h.total > 0)
          .map((h) => (
            <span
              key={h.hub}
              className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[var(--ink-3)]"
              style={{ background: "var(--surface-2)" }}
            >
              {HUB_LABELS[h.hub] ?? h.hub} · {h.total}
            </span>
          ))}
      </div>
    </div>
  );
}
