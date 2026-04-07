import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import LiveRadar from './components/LiveRadar';
import DeviceList from './components/DeviceList';
import LogHistory from './components/LogHistory';
import NetworkRules from './components/NetworkRules';


function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentMenu, setCurrentMenu] = useState('dashboard'); // Điều hướng menu

  // Quản lý kết nối Socket toàn cục
  useEffect(() => {
    const socket = io('http://localhost:3000');
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    return () => socket.disconnect();
  }, []);

  return (
    <div className="flex h-screen bg-[#0f172a] font-mono overflow-hidden text-slate-200">
      {/* Cột trái: Sidebar */}
      <Sidebar currentMenu={currentMenu} setCurrentMenu={setCurrentMenu} />

      {/* Cột phải: Nội dung chính */}
      <div className="flex-1 flex flex-col">
        {/* Thanh điều hướng trên cùng */}
        <TopNav isConnected={isConnected} />

        {/* Khu vực hiển thị động dựa theo Menu */}
        <main className="flex-1 p-6 overflow-y-auto">
          {currentMenu === 'dashboard' && (
            <LiveRadar />
          )}
          
          {currentMenu === 'devices' && (
            <DeviceList/>
          )}

          {currentMenu === 'network' && (
            <NetworkRules />
          )}
          
{currentMenu === 'logs' && (
             <LogHistory />
          )}

        </main>
      </div>
    </div>
  );
}

export default App;

