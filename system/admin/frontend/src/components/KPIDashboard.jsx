import { Activity, Shield, AlertCircle, Unlock } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const KPIDashboard = ({ kpis = [] }) => {
  const stats = (kpis ?? []).map(kpi => ({
    title: kpi.title ?? 'Unknown',
    value: kpi.value ?? '0',
    change: kpi.change ?? '0%',
    icon: kpi.icon ?? Activity,
    color: kpi.color ?? 'info',
  }));

  const cn = (...inputs) => twMerge(clsx(inputs));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 p-2">
      {(stats ?? []).map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={stat.title ?? index} className={cn(
            'glassmorphism p-6 rounded-2xl shadow-2xl hover:shadow-[0_25px_50px_rgba(0,0,0,0.25)] transition-all duration-300 group',
            'border-2 border-white/10 backdrop-blur-xl',
            `bg-gradient-to-br from-${stat.color}-500/15 via-slate-900/50 to-[#0B1120]`
          )}>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-white/10 rounded-xl group-hover:scale-110 transition-transform backdrop-blur-sm">
                <Icon className={cn('w-8 h-8', `text-${stat.color}-400`)} />
              </div>
              <span className={cn('text-xs font-mono uppercase tracking-wider opacity-75', `text-${stat.color}-300`)}>
                {stat.change?.startsWith('+') ? '↑' : '↓'} {stat.change}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-slate-100 tracking-tight">{stat.value}</p>
              <p className="text-slate-400 font-medium mt-1">{stat.title}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KPIDashboard;

