import { Shield, MonitorSmartphone, Globe, History, Command, User } from 'lucide-react';

const Sidebar = ({ currentMenu, setCurrentMenu }) => {
  const menuItems = [
    { id: 'dashboard', icon: Shield, label: 'Live Radar' },
    { id: 'devices', icon: MonitorSmartphone, label: 'Thiết bị (Agents)' },
    { id: 'network', icon: Globe, label: 'Quy tắc Mạng' },
    { id: 'command-center', icon: Command, label: 'Command Center' },
    { id: 'logs', icon: History, label: 'Lịch sử cảnh báo' },

  ];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 h-screen p-4 flex flex-col">
      <div className="flex items-center gap-3 px-2 mb-8 mt-2">
        <Shield className="text-cyan-400 w-8 h-8" />
        <h1 className="text-xl font-bold text-slate-100 tracking-wider">ZeroTrust</h1>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentMenu === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentMenu(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive 
                  ? 'bg-cyan-900/40 text-cyan-400 border border-cyan-800/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-800">
        <div className="text-xs text-slate-500 text-center">
          STU Security Project<br/>v1.0.0
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

