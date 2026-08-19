"use client";

import { useState } from "react";

export type TrendPoint = {
  label: string;
  value: number;
};

type Props = {
  data: TrendPoint[];
  height?: number;
  unit?: string;
};

export function TrendChart({ data, height = 140, unit = "" }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0) return null;

  const w = 720;
  const h = height;
  const padX = 12;
  const padTop = 16;
  const padBottom = 28;
  const chartW = w - padX * 2;
  const chartH = h - padTop - padBottom;

  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const min = 0;

  const stepX = chartW / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => {
    const x = padX + i * stepX;
    const y = padTop + ((max - d.value) / (max - min || 1)) * chartH;
    return { x, y, value: d.value, label: d.label };
  });

  const linePath = points
    .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
    .join(" ");

  const areaPath = `${linePath} L${points[points.length - 1].x},${padTop + chartH} L${padX},${padTop + chartH} Z`;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto"
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
      >
        {/* Horizontal gridlines (3 lines: 0, mid, max) */}
        {[0, 0.5, 1].map((frac, i) => {
          const y = padTop + frac * chartH;
          return (
            <line
              key={i}
              x1={padX}
              y1={y}
              x2={padX + chartW}
              y2={y}
              stroke="var(--color-rule)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              strokeDasharray={i === 0 || i === 2 ? "0" : "2,3"}
            />
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="var(--color-accent)" fillOpacity="0.08" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <rect
              x={p.x - stepX / 2}
              y={padTop}
              width={stepX}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={hover === i ? 4 : 2.5}
              fill={hover === i ? "var(--color-ink)" : "var(--color-card)"}
              stroke="var(--color-ink)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              style={{ transition: "r 0.15s" }}
            />
          </g>
        ))}

        {/* X-axis labels */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={h - 10}
            textAnchor="middle"
            className="fill-[var(--color-ink-soft)]"
            fontSize="10"
            fontFamily="var(--font-mono)"
          >
            {p.label}
          </text>
        ))}

        {/* Max value label */}
        <text
          x={padX}
          y={padTop - 4}
          className="fill-[var(--color-ink-soft)]"
          fontSize="10"
          fontFamily="var(--font-mono)"
        >
          {max.toLocaleString("en-US")}
          {unit && ` ${unit}`}
        </text>
      </svg>

      {/* Hover tooltip */}
      {hover !== null && (
        <div
          className="absolute pointer-events-none bg-ink text-white text-[11px] font-mono px-2 py-1 rounded shadow-lg -translate-x-1/2 -translate-y-full"
          style={{
            left: `${((points[hover].x) / w) * 100}%`,
            top: `${((points[hover].y) / h) * 100}%`,
          }}
        >
          <span className="text-white/60 uppercase tracking-[0.08em]">
            {points[hover].label}
          </span>
          <span className="ml-2 tabular-nums">
            {points[hover].value.toLocaleString("en-US")}
            {unit && ` ${unit}`}
          </span>
        </div>
      )}
    </div>
  );
}
