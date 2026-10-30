import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

export default function OneRMChart({ sessions = [] }) {
  // Estimated 1RM using Brzycki formula: Weight * (36 / (37 - reps))
  const chartData = React.useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return [];
    }

    return sessions.map((s, idx) => {
      const reps = Math.min(s.reps || 1, 36);
      const weight = s.weight || 20;
      const oneRM = reps >= 1 ? weight * (36 / (37 - reps)) : weight;

      return {
        date: `S${idx + 1}`,
        estimated1RM: Math.round(oneRM * 10) / 10,
        exercise: s.exercise || 'Lift'
      };
    });
  }, [sessions]);

  return (
    <div className="analytics-card">
      <div className="analytics-card-header">
        <div>
          <h4 className="analytics-card-title">1RM STRENGTH PROGRESSION</h4>
          <span className="analytics-card-subtitle">
            Estimated maximal capacity (Brzycki kinematic equation)
          </span>
        </div>
        {chartData.length > 0 && (
          <span className="analytics-card-tag">
            PEAK: {Math.max(...chartData.map(c => c.estimated1RM))} KG
          </span>
        )}
      </div>

      {chartData.length === 0 ? (
        <div className="empty-chart-state">
          <div className="empty-chart-icon">📈</div>
          <div className="empty-chart-title">NO 1RM METRICS RECORDED</div>
          <p className="empty-chart-desc">
            Complete sets with weights in the workout tracker to view single-rep max capacity projections.
          </p>
        </div>
      ) : (
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              <Line
                type="monotone"
                dataKey="estimated1RM"
                stroke="#45E6F2"
                strokeWidth={2}
                dot={{ r: 3, fill: '#45E6F2' }}
                activeDot={{ r: 5, fill: '#FFFFFF' }}
                name="1RM (kg)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
