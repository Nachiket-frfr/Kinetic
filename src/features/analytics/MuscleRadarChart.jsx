import React, { useMemo } from 'react';

const AXES = [
  { key: 'back', label: 'Back' },
  { key: 'chest', label: 'Chest' },
  { key: 'core', label: 'Core' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'arms', label: 'Arms' },
  { key: 'legs', label: 'Legs' },
];

const VIEW_WIDTH = 340;
const VIEW_HEIGHT = 340;
const CENTER_X = 170;
const CENTER_Y = 155;
const RADIUS = 100;
const LEVELS = [1 / 3, 2 / 3, 1]; // 3 concentric levels

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Math.round((cx + r * Math.cos(rad)) * 100) / 100,
    y: Math.round((cy + r * Math.sin(rad)) * 100) / 100,
  };
}

function getAxisValue(data, key) {
  if (!data || typeof data !== 'object') return 0;
  const val = data[key] ?? data[key.toLowerCase()] ?? data[key.toUpperCase()] ?? 0;
  const num = Number(val);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.min(100, num));
}

export default function MuscleRadarChart({
  current = {},
  previous = {},
  className = '',
  style = {},
}) {
  const step = 360 / AXES.length; // 60 degrees

  // Hexagonal web grid lines (3 concentric levels)
  const gridPolygons = useMemo(() => {
    return LEVELS.map((level, idx) => {
      const levelRadius = RADIUS * level;
      const points = AXES.map((_, i) => {
        const angle = i * step - 90;
        const pt = polarToCartesian(CENTER_X, CENTER_Y, levelRadius, angle);
        return `${pt.x},${pt.y}`;
      }).join(' ');

      return (
        <polygon
          key={`grid-level-${idx}`}
          points={points}
          className="muscle-radar-grid-web"
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
        />
      );
    });
  }, [step]);

  // 6 radial axis lines from center to maximum radius
  const axisLines = useMemo(() => {
    return AXES.map((axis, i) => {
      const angle = i * step - 90;
      const tip = polarToCartesian(CENTER_X, CENTER_Y, RADIUS, angle);
      return (
        <line
          key={`axis-line-${axis.key}`}
          x1={CENTER_X}
          y1={CENTER_Y}
          x2={tip.x}
          y2={tip.y}
          className="muscle-radar-grid-axis"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1"
        />
      );
    });
  }, [step]);

  // Previous polygon coordinates and vertex dots
  const { prevPoints } = useMemo(() => {
    const vertices = AXES.map((axis, i) => {
      const val = getAxisValue(previous, axis.key);
      const r = (val / 100) * RADIUS;
      const angle = i * step - 90;
      return { ...polarToCartesian(CENTER_X, CENTER_Y, r, angle), val, label: axis.label };
    });
    return {
      prevPoints: vertices.map((v) => `${v.x},${v.y}`).join(' '),
    };
  }, [previous, step]);

  // Current polygon coordinates and vertex dots
  const { currPoints, currVertices } = useMemo(() => {
    const vertices = AXES.map((axis, i) => {
      const val = getAxisValue(current, axis.key);
      const r = (val / 100) * RADIUS;
      const angle = i * step - 90;
      return { ...polarToCartesian(CENTER_X, CENTER_Y, r, angle), val, label: axis.label };
    });
    return {
      currPoints: vertices.map((v) => `${v.x},${v.y}`).join(' '),
      currVertices: vertices,
    };
  }, [current, step]);

  // Axis labels positioned outside the hexagon vertices
  const axisLabels = useMemo(() => {
    return AXES.map((axis, i) => {
      const angle = i * step - 90;
      let textAnchor = 'middle';
      let dominantBaseline = 'central';
      let extraX = 0;
      let extraY = 0;
      let offsetR = RADIUS + 18;

      if (i === 0) {
        // Back (Top)
        textAnchor = 'middle';
        dominantBaseline = 'auto';
        extraY = -8;
        offsetR = RADIUS;
      } else if (i === 3) {
        // Shoulders (Bottom)
        textAnchor = 'middle';
        dominantBaseline = 'hanging';
        extraY = 12;
        offsetR = RADIUS;
      } else if (i === 1 || i === 2) {
        // Chest & Core (Right)
        textAnchor = 'start';
        dominantBaseline = 'central';
        extraX = 6;
      } else {
        // Arms & Legs (Left)
        textAnchor = 'end';
        dominantBaseline = 'central';
        extraX = -6;
      }

      const basePos = polarToCartesian(CENTER_X, CENTER_Y, offsetR, angle);
      const labelX = basePos.x + extraX;
      const labelY = basePos.y + extraY;

      return (
        <text
          key={`axis-label-${axis.key}`}
          x={labelX}
          y={labelY}
          textAnchor={textAnchor}
          dominantBaseline={dominantBaseline}
          className="muscle-radar-axis-label"
          fill="#A0A0AB"
          fontSize="11"
          fontWeight="600"
          fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', sans-serif"
        >
          {axis.label}
        </text>
      );
    });
  }, [step]);

  return (
    <div
      className={`muscle-radar-container radar-chart-container ${className}`.trim()}
      style={style}
    >
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="muscle-radar-svg radar-chart-svg"
        role="img"
        aria-label="Muscle distribution radar chart"
      >
        {/* Dark theme background */}
        <rect
          width="100%"
          height="100%"
          className="muscle-radar-bg"
          fill="#0D1117"
          rx="8"
        />

        {/* Clean hexagonal web grid lines (3 concentric levels) */}
        {gridPolygons}

        {/* 6 radial axis lines */}
        {axisLines}

        {/* Previous polygon (gray, semi-transparent outline) */}
        <polygon
          points={prevPoints}
          className="muscle-radar-polygon-previous"
          fill="rgba(118, 116, 114, 0.15)"
          stroke="#767472"
          strokeWidth="1.5"
        />

        {/* Current polygon (electric blue, semi-transparent) */}
        <polygon
          points={currPoints}
          className="muscle-radar-polygon-current"
          fill="rgba(21, 143, 242, 0.28)"
          stroke="#158FF2"
          strokeWidth="2"
        />

        {/* Vertex dots on current */}
        {currVertices.map((v, i) => (
          <circle
            key={`curr-dot-${i}`}
            cx={v.x}
            cy={v.y}
            r="3.5"
            fill="#158FF2"
            stroke="#000000"
            strokeWidth="1.5"
          >
            <title>{`${v.label}: ${v.val}%`}</title>
          </circle>
        ))}

        {/* Labels at each axis point */}
        {axisLabels}

        {/* Legend at bottom: ● Current ● Previous */}
        <g
          className="muscle-radar-legend radar-chart-legend"
          role="group"
          aria-label="● Current ● Previous"
        >
          {/* Current legend item */}
          <circle cx={105} cy={312} r={4} fill="#158FF2" />
          <text
            x={115}
            y={313}
            fill="#FFFFFF"
            fontSize="12"
            fontWeight="500"
            dominantBaseline="central"
            fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', sans-serif"
            className="muscle-radar-legend-text"
          >
            Current
          </text>

          {/* Previous legend item */}
          <circle cx={180} cy={312} r={4} fill="#666" />
          <text
            x={190}
            y={313}
            fill="#A0A0AB"
            fontSize="12"
            fontWeight="500"
            dominantBaseline="central"
            fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', sans-serif"
            className="muscle-radar-legend-text"
          >
            Previous
          </text>
        </g>
      </svg>
    </div>
  );
}
