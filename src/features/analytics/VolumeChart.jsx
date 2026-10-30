import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

export default function VolumeChart({ sessions = [] }) {
  const chartData = React.useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return [];
    }

    const map = {};
    sessions.forEach((s) => {
      const d = s.date || 'Today';
      const vol = (s.reps || 0) * (s.weight || 0);
      map[d] = (map[d] || 0) + vol;
    });

    return Object.entries(map).map(([date, volume]) => ({
      date: date.length > 5 ? date.slice(5) : date,
      volume: Math.round(volume),
    }));
  }, [sessions]);

  return (
    <div className="analytics-card">
      <div className="analytics-card-header">
        <div>
          <h4 className="analytics-card-title">WORKOUT VOLUME</h4>
          <span className="analytics-card-subtitle">
            Daily cumulative tonnage (load × repetitions)
          </span>
        </div>
        {chartData.length > 0 && (
          <span className="analytics-card-tag">
            {chartData.reduce((acc, c) => acc + c.volume, 0).toLocaleString()} KG TOTAL
          </span>
        )}
      </div>

      {chartData.length === 0 ? (
        <div className="empty-chart-state">
          <div className="empty-chart-icon">📊</div>
          <div className="empty-chart-title">NO SUFFICIENT DATA YET</div>
          <p className="empty-chart-desc">
            Complete and log your tracked workout sessions to unlock volume progression curves.
          </p>
        </div>
      ) : (
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="volumeCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#45E6F2" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#45E6F2" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1C2633" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#566170"
                fontSize={11}
                tickLine={false}
                fontFamily="JetBrains Mono, monospace"
              />
              <YAxis
                stroke="#566170"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                fontFamily="JetBrains Mono, monospace"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#121821',
                  borderColor: '#1C2633',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#F2F6FA',
                  fontFamily: 'JetBrains Mono, monospace',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)'
                }}
              />
              <Area
                type="monotone"
                dataKey="volume"
                stroke="#45E6F2"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#volumeCyan)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
