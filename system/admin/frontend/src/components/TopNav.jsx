import { Activity } from 'lucide-react';

const TopNav = ({ isConnected }) => {
    return (
        <header className="h-16 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between px-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-200">Command Center</h2>
            
            <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-800 border border-slate-700 shadow-inner">
                <Activity className={`w-4 h-4 ${isConnected ? 'text-emerald-400' : 'text-red-400'}`} />
                <span className={`text-sm font-medium ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isConnected ? 'System Online' : 'Connection Lost'}
                </span>
                <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            </div>
        </header>
    );
};

export default TopNav;