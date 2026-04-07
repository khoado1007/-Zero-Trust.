import { useState } from 'react';
import { User, Building, ShieldCheck, AlertTriangle, Unlock } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const DeviceTable = ({ devices = [], approveJIT }) => {
  const cn = (...inputs) => twMerge(clsx(inputs));

  const getStatusIcon = (status) => {
    const icons = {
      SAFE: ShieldCheck,
      'WARN_1': AlertTriangle,
      'WARN_2': AlertTriangle,
      LOCKED: User,
    };
    return icons[status] ?? ShieldCheck;
  };

  const getStatusColor = (status) => {
    const colors = {
      SAFE: 'safe',
      'WARN_1': 'warn',
      'WARN_2': 'warn',
      LOCKED: 'locked',
    };
    return colors[status] ?? 'info';
  };

  const getStatusLabel = (status) => {
    const labels = {
      SAFE: 'SAFE',
      'WARN_1': 'WARN 1',
      'WARN_2': 'WARN 2',
      LOCKED: 'LOCKED',
    };
    return labels[status] ?? status;
  };

  const handleApprove = (deviceId) => {
    approveJIT?.(deviceId);
  };

  return (
    <div className="glassmorphism p-6 rounded-2xl overflow-hidden backdrop-blur-xl border-2 border-white/10">
      <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
        <Building className="w-6 h-6 text-blue-400" />
        Monitored Devices ({(devices ?? []).length})
      </h3>
      {(devices ?? []).length === 0 ? (
        <div className="flex items-center justify-center h-64 text-slate-500">
          No devices connected
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="p-4 text-left font-semibold text-slate-300">Device Name</th>
                <th className="p-4 text-left font-semibold text-slate-300">OS User</th>
                <th className="p-4 text-left font-semibold text-slate-300">Department</th>
                <th className="p-4 text-left font-semibold text-slate-300">Status</th>
                <th className="p-4 text-right font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(devices ?? []).map((device) => {
                const StatusIcon = getStatusIcon(device.status);
                const color = getStatusColor(device.status);
                const label = getStatusLabel(device.status);
                return (
                  <tr key={device.id ?? Math.random()} className="border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-mono text-slate-200 font-semibold">{device.name ?? 'Unknown'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-slate-400" />
                        <span>{device.user ?? 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium uppercase',
                        device.dept === 'SALES' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      )}>
                        {device.dept ?? 'Unknown'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        'flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold border',
                        `bg-${color}-500/10 text-${color}-400 border-${color}-400/50`
                      )}>
                        <StatusIcon className="w-4 h-4" />
                        {label}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {['LOCKED', 'WARN_1', 'WARN_2'].includes(device.status) ? (
                        <button
                          onClick={() => handleApprove(device.id)}
                          className={cn(
                            'px-6 py-2 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-500/20 to-emerald-500/20',
                            'text-blue-400 border border-blue-500/50 hover:from-blue-500/40 hover:to-emerald-500/40 hover:text-white',
                            'hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2 mx-auto'
                          )}
                        >
                          <Unlock className="w-4 h-4" />
                          Approve JIT 2h
                        </button>
                      ) : (
                        <span className="text-slate-500 text-sm italic">✓ Normal</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DeviceTable;

