import { useState, useEffect, useRef } from 'react';
import { Terminal, Play } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const TerminalLogs = ({ logs = [] }) => {
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const cn = (...inputs) => twMerge(clsx(inputs));

  const getLogStyle = (log) => {
    if ((log ?? '').includes('[SAFE') || (log ?? '').includes('[INFO')) return 'text-emerald-400';
    if ((log ?? '').includes('[WARN')) return 'text-amber-400';
    if ((log ?? '').includes('[LOCKED') || (log ?? '').includes('[CRITICAL')) return 'text-red-400';
    return 'text-slate-400';
  };

  return (
    <div className="glassmorphism col-span-full rounded-2xl flex flex-col h-[400px] border-2 border-slate-800/50 shadow-2xl backdrop-blur-xl bg-gradient-to-b from-slate-900/50 to-[#0B1120]/80">
      <div className="flex items-center gap-3 p-6 pb-4 border-b border-slate-700/50">
        <Terminal className="text-slate-400 w-7 h-7" />
        <h3 className="font-bold text-xl text-slate-200 font-mono tracking-tight">ZeroTrust Terminal Logs</h3>
        <Play className="w-5 h-5 text-emerald-500 ml-auto animate-pulse" />
      </div>
      <div className="flex-1 p-6 overflow-y-auto bg-black/95 font-mono text-sm leading-relaxed">
        {((logs ?? [])).length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm font-mono">
            Waiting for logs...
          </div>
        ) : (
          (logs ?? []).map((log, i) => (
            <div key={i} className={cn('mb-3 flex items-start gap-4 pl-2', getLogStyle(log))}>
              <span className="text-slate-600 w-20 flex-shrink-0 font-mono">$ zt</span>
              <span className="font-mono break-all">{log}</span>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default TerminalLogs;

