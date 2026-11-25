import React, { useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';

const telemetryData = [
  { time: '00:00', vibration: 2.1, temp: 58, load: 72 },
  { time: '03:00', vibration: 2.3, temp: 59, load: 70 },
  { time: '06:00', vibration: 2.8, temp: 63, load: 85 },
  { time: '09:00', vibration: 3.5, temp: 68, load: 92 },
  { time: '12:00', vibration: 4.8, temp: 76, load: 98 },
  { time: '15:00', vibration: 5.4, temp: 81, load: 95 },
  { time: '18:00', vibration: 5.1, temp: 79, load: 88 },
  { time: '21:00', vibration: 4.2, temp: 72, load: 80 },
];

export default function TelemetryChart() {
  const [metric, setMetric] = useState('vibration'); // vibration | temp | load

  const configs = {
    vibration: {
      key: 'vibration',
      name: 'Vibration RMS',
      unit: 'mm/s',
      color: '#8B5CF6',
      threshold: 4.5,
      thresholdLabel: 'ISO 10816 Limit (4.5 mm/s)'
    },
    temp: {
      key: 'temp',
      name: 'Bearing Temp',
      unit: '°C',
      color: '#EF4444',
      threshold: 75,
      thresholdLabel: 'Max Operating Temp (75°C)'
    },
    load: {
      key: 'load',
      name: 'Motor Load',
      unit: '%',
      color: '#10B981',
      threshold: 90,
      thresholdLabel: 'High Load Alert (90%)'
    }
  };

  const activeConfig = configs[metric];

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            type="button"
            onClick={() => setMetric('vibration')}
            style={{
              background: metric === 'vibration' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              border: `1px solid ${metric === 'vibration' ? '#8B5CF6' : '#374151'}`,
              color: metric === 'vibration' ? '#A78BFA' : '#9CA3AF',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Vibration (mm/s)
          </button>
          <button 
            type="button"
            onClick={() => setMetric('temp')}
            style={{
              background: metric === 'temp' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
              border: `1px solid ${metric === 'temp' ? '#EF4444' : '#374151'}`,
              color: metric === 'temp' ? '#FCA5A5' : '#9CA3AF',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Temp (°C)
          </button>
          <button 
            type="button"
            onClick={() => setMetric('load')}
            style={{
              background: metric === 'load' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              border: `1px solid ${metric === 'load' ? '#10B981' : '#374151'}`,
              color: metric === 'load' ? '#6EE7B7' : '#9CA3AF',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Load (%)
          </button>
        </div>
        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
          Live Telemetry • <span style={{ color: '#10B981', fontWeight: 600 }}>Active</span>
        </div>
      </div>

      <div style={{ width: '100%', height: '140px', minHeight: '140px', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={140}>
          <AreaChart data={telemetryData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={activeConfig.color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={activeConfig.color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" stroke="#6B7280" fontSize={10} tickLine={false} />
            <YAxis stroke="#6B7280" fontSize={10} tickLine={false} />
            <Tooltip 
              contentStyle={{ 
                background: '#1F2937', 
                borderColor: '#374151', 
                borderRadius: '8px', 
                fontSize: '12px',
                color: '#fff' 
              }}
              formatter={(val) => [`${val} ${activeConfig.unit}`, activeConfig.name]}
            />
            <ReferenceLine 
              y={activeConfig.threshold} 
              stroke="#EF4444" 
              strokeDasharray="3 3"
              label={{ value: 'Limit', fill: '#EF4444', fontSize: 10, position: 'right' }} 
            />
            <Area 
              type="monotone" 
              dataKey={activeConfig.key} 
              stroke={activeConfig.color} 
              strokeWidth={2}
              fillOpacity={1} 
              fill={`url(#grad-${metric})`} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
