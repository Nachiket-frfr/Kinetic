import React from 'react';

export default function WeightChart({ history = [], period = '3m' }) {
  if (!history || history.length === 0) {
    return <div className="profile-chart-empty">No weight data yet. Log your first weight entry above!</div>;
  }

  const cutoff = new Date();
  if (period === '3m') cutoff.setMonth(cutoff.getMonth() - 3);
  else if (period === '6m') cutoff.setMonth(cutoff.getMonth() - 6);
  else if (period === '1y') cutoff.setFullYear(cutoff.getFullYear() - 1);
  else cutoff.setFullYear(cutoff.getFullYear() - 5);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const filtered = history
    .filter((e) => (e.date || '') >= cutoffStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (filtered.length === 0) {
    return <div className="profile-chart-empty">No entries in this timeframe</div>;
  }

  const weights = filtered.map((e) => e.weightKg);
  const minW = Math.max(0, Math.min(...weights) - 2);
  const maxW = Math.max(...weights) + 2;
  const range = maxW - minW || 1;

  const W = 360, H = 140, PAD = 36;
  const plotW = W - PAD * 2;
  const plotH = H - PAD;

  const points = filtered.map((e, i) => {
    const x = PAD + (filtered.length === 1 ? plotW / 2 : (i / (filtered.length - 1)) * plotW);
    const y = PAD / 2 + plotH - ((e.weightKg - minW) / range) * plotH;
    return { x, y, entry: e };
  });

  const ticks = [minW, Math.round((minW + maxW) / 2), maxW];

  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} className="weight-chart-svg" style={{ width: '100%', height: 'auto' }}>
      {ticks.map((t, i) => {
        const y = PAD / 2 + plotH - ((t - minW) / range) * plotH;
        return (
          <g key={i}>
            <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="var(--border, #2A2B2E)" strokeWidth="1" strokeDasharray="3 3" />
            <text x={PAD - 6} y={y} textAnchor="end" fill="var(--text-muted, #767472)" fontSize="10" dominantBaseline="central" fontFamily="var(--font-mono)">
              {t}kg
            </text>
          </g>
        );
      })}

      {points.length > 1 && (
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="var(--accent, #158FF2)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4.5" fill="var(--surface, #1B1C1E)" stroke="var(--accent, #158FF2)" strokeWidth="2.5" />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fill="var(--text-primary, #E4E6E9)" fontSize="10" fontWeight="700" fontFamily="var(--font-mono)">
            {p.entry.weightKg}
          </text>
        </g>
      ))}
    </svg>
  );
}
