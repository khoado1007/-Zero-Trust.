import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const LiveRadarChart = ({ chartData = [] }) => {
  const data = (chartData ?? []).length > 0 ? chartData : [
    { hour: 'No Data', ping: 0, threat: 0 }
  ];

  const cn = (...inputs) => twMerge(clsx(inputs));

  return (
    <div className="glassmorphism p-6 rounded-2xl h-[300px] backdrop-blur-xl border-2 border-white/10">
      <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
        Ping Frequency vs Threat Level (Live)
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="safeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="hsl(217 72% 20% / 0.5)" />
          <XAxis dataKey="hour" stroke="#94a3b8" fontFamily="Inter" axisLine={false} tickLine={false} tickMargin={8} />
          <YAxis stroke="#94a3b8" fontFamily="Inter" axisLine={false} tickLine={false} tickMargin={8} width={40} />
          <Tooltip labelFormatter={() => ''} formatter={(value) => [`${value}`, 'Value']} />
          <Legend />
          {(data ?? []).map((d, i) => (
            <Area 
              key={`ping-${i}`} 
              type="monotone" 
              dataKey="ping" 
              stroke="#3B82F6" 
              strokeWidth={3} 
              fillOpacity={1} 
              fill="url(#safeGradient)" 
              name="Ping Freq" 
            />
          ))}
          {(data ?? []).map((d, i) => (
            <Area 
              key={`threat-${i}`} 
              type="monotone" 
              dataKey="threat" 
              stroke="#EF4444" 
              strokeWidth={3} 
              fillOpacity={1} 
              fill="url(#threatGradient)" 
              name="Threat Level" 
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LiveRadarChart;

