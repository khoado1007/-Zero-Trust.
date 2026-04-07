import { useState, useEffect } from 'react';
import { History, Laptop, ShieldCheck, ShieldAlert, ChevronRight, ArrowLeft, LockKeyhole, LockOpen, Table, LayoutList } from 'lucide-react';

const LogHistory = () => {
    const [devices, setDevices] = useState([]);
    const [allLogs, setAllLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [viewMode, setViewMode] = useState('timeline');

    // Tách riêng 2 API để nếu lỗi 1 cái thì cái kia vẫn sống
    const fetchData = async () => {
        try {
            // Lấy danh sách máy từ PostgreSQL
            const devRes = await fetch('http://localhost:3000/api/v1/devices');
            if (!devRes.ok) throw new Error(`Lỗi API Devices: ${devRes.status}`);
            const devs = await devRes.json();
            setDevices(Array.isArray(devs) ? devs : []);

            // Lấy lịch sử từ MongoDB
            const logRes = await fetch('http://localhost:3000/api/v1/logs');
            if (logRes.ok) {
                const logs = await logRes.json();
                setAllLogs(Array.isArray(logs) ? logs : []);
            }
        } catch (error) {
            console.error("[-] Lỗi khi tải dữ liệu:", error);
            setErrorMsg("Không thể tải dữ liệu từ Database. Backend Node.js có đang chạy không?");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Thuật toán: Gom nhóm, Lọc 1 Event/Ngày
    const processLogsForDevice = (deviceId) => {
        const deviceLogs = allLogs
            .filter(log => log.device_id === deviceId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        const dailyRecord = {};

        deviceLogs.forEach(log => {
            const dateStr = new Date(log.timestamp).toLocaleDateString('vi-VN');
            if (!dailyRecord[dateStr]) {
                dailyRecord[dateStr] = { hasInvalid: false, hasValid: false, events: [] };
            }

            const isManualAction = log.message?.includes('[LỆNH TỪ ADMIN]');
            const isInvalid = log.status === 'CRITICAL' && !isManualAction;
            const isValid = log.status === 'SAFE' && !isManualAction;

            if (isManualAction) {
                dailyRecord[dateStr].events.push(log);
            } else if (isInvalid && !dailyRecord[dateStr].hasInvalid) {
                dailyRecord[dateStr].hasInvalid = true;
                dailyRecord[dateStr].events.push(log);
            } else if (isValid && !dailyRecord[dateStr].hasValid) {
                dailyRecord[dateStr].hasValid = true;
                dailyRecord[dateStr].events.push(log);
            }
        });

        const finalGrouped = {};
        const sortedDates = Object.keys(dailyRecord).sort((a, b) => {
            const [d1, m1, y1] = a.split('/');
            const [d2, m2, y2] = b.split('/');
            return new Date(`${y2}-${m2}-${d2}`) - new Date(`${y1}-${m1}-${d1}`);
        });

        sortedDates.forEach(date => {
            finalGrouped[date] = dailyRecord[date].events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        });

        return finalGrouped;
    };

    const formatTime = (dateString) => new Date(dateString).toLocaleTimeString('vi-VN');

    // Màn hình Loading
    if (loading) return <div className="text-cyan-400 animate-pulse text-center mt-10 font-bold text-xl">Đang đồng bộ kho dữ liệu Database...</div>;

    // Màn hình Báo Lỗi
    if (errorMsg) return <div className="text-red-500 bg-red-900/20 p-6 rounded-xl border border-red-500 font-bold text-center mt-10">{errorMsg}</div>;

    // ==========================================
    // VIEW 1: MÀN HÌNH DANH SÁCH THIẾT BỊ
    // ==========================================
    if (!selectedDevice) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl h-[calc(100vh-140px)] flex flex-col">
                <h2 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-2">
                    <History className="text-cyan-400 w-6 h-6" />
                    Lưu trữ Lịch sử theo Thiết bị
                </h2>
                
                <div className="flex-1 overflow-y-auto pr-2">
                    {devices.length === 0 ? (
                        <div className="text-slate-400 text-center mt-10 italic border border-slate-700 p-8 rounded-lg bg-slate-800/30">
                            Hệ thống báo cáo không có thiết bị nào. Hãy kiểm tra lại Tab "Thiết bị (Agents)"!
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {devices.map((device) => (
                                <div 
                                    key={device.id} 
                                    onClick={() => {
                                        setSelectedDevice(device.deviceId);
                                        setViewMode('timeline');
                                    }}
                                    className="bg-slate-800 border border-slate-700 p-4 rounded-xl cursor-pointer hover:bg-slate-700 hover:border-cyan-500/50 transition-all group flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 group-hover:border-cyan-500/50 transition-colors">
                                            <Laptop className="w-6 h-6 text-cyan-400" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-200 font-mono tracking-wider">{device.deviceId}</div>
                                            <div className="text-sm text-slate-400">{device.user?.fullName || 'Chưa định danh'}</div>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Table View - New Simple Table for all logs
    if (viewMode === 'table') {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl flex flex-col h-[calc(100vh-140px)]">
                <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setSelectedDevice(null)}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all border border-slate-700 flex items-center gap-2"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span>Quay lại danh sách</span>
                        </button>
                        <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                            <Table className="text-cyan-400 w-7 h-7" />
                            Lịch sử Cảnh báo (Toàn bộ - 100 logs mới nhất)
                        </h2>
                    </div>
                    <button 
                        onClick={() => setViewMode('timeline')}
                        className="flex items-center gap-2 bg-cyan-600/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 px-4 py-2 rounded-lg font-medium transition-all"
                    >
                        <LayoutList className="w-4 h-4" />
                        Chuyển sang Timeline
                    </button>
                </div>

                <div className="flex-1 overflow-hidden">
                    {allLogs.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-slate-400 italic">
                            <History className="w-12 h-12 mr-4 opacity-50" />
                            <div>
                                <div className="text-2xl font-bold mb-2">Chưa có dữ liệu log</div>
                                <div className="text-sm">Hệ thống sẽ tự động cập nhật khi có cảnh báo mới từ agents.</div>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-auto h-full">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-700 bg-slate-800/50">
                                        <th className="p-4 text-left font-bold text-slate-200 w-32">Thời gian</th>
                                        <th className="p-4 text-left font-bold text-slate-200">Thiết bị</th>
                                        <th className="p-4 text-left font-bold text-slate-200 w-32">IP</th>
                                        <th className="p-4 text-left font-bold text-slate-200 w-28">Trạng thái</th>
                                        <th className="p-4 text-left font-bold text-slate-200 flex-1">Chi tiết</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allLogs.map((log) => {
                                        const timeStr = new Date(log.timestamp).toLocaleString('vi-VN');
                                        const isSafe = log.status === 'SAFE' || (log.action_taken && log.action_taken.toLowerCase().includes('allowed'));
                                        return (
                                            <tr key={log._id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                                <td className="p-4 font-mono text-slate-300">{timeStr}</td>
                                                <td className="p-4 font-mono text-cyan-400">{log.device_id}</td>
                                                <td className="p-4 font-mono text-slate-300">{log.ip_address}</td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                                                        isSafe 
                                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                    }`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-slate-200 max-w-md truncate" title={log.message}>
                                                    {log.message}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ==========================================
    // VIEW 2: MÀN HÌNH LỊCH SỬ CHI TIẾT (ĐÃ LỌC)
    // ==========================================
    const groupedLogs = processLogsForDevice(selectedDevice);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl flex flex-col h-[calc(100vh-140px)]">
            <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setSelectedDevice(null)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all border border-slate-700 flex items-center gap-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Quay lại
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                            <LayoutList className="text-emerald-400 w-7 h-7" />
                            Hồ sơ: <span className="text-cyan-400 font-mono">{selectedDevice}</span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">Đã bật thuật toán chống SPAM (Lưu 1 Event/Ngày)</p>
                    </div>
                </div>
                <button 
                    onClick={() => setViewMode('table')}
                    className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-4 py-2 rounded-lg font-medium transition-all"
                >
                    <Table className="w-4 h-4" />
                    Xem dạng Bảng
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
                {Object.keys(groupedLogs).length === 0 ? (
                    <div className="text-center text-slate-500 italic mt-10 bg-slate-800/30 p-8 rounded-lg border border-slate-700">
                        Chưa có sự kiện nào được ghi nhận cho thiết bị này.
                    </div>
                ) : (
                    Object.keys(groupedLogs).map((date) => (
                        <div key={date} className="mb-8">
                            <div className="sticky top-0 bg-slate-900/95 py-2 mb-4 z-10 backdrop-blur-sm border-b border-slate-800">
                                <h3 className="font-bold text-slate-300 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
                                    Ngày {date}
                                </h3>
                            </div>
                            
                            <div className="space-y-4 pl-4 border-l-2 border-slate-800 ml-1">
                                {groupedLogs[date].map((log) => {
                                    const isManual = log.message?.includes('[LỆNH TỪ ADMIN]');
                                    const isSafe = log.status === 'SAFE';

                                    return (
                                        <div key={log._id} className="relative pl-6">
                                            <div className={`absolute -left-[9px] top-2 w-4 h-4 rounded-full ring-4 ring-slate-900 ${
                                                isManual ? 'bg-indigo-500' : isSafe ? 'bg-emerald-500' : 'bg-red-500'
                                            }`}></div>
                                            
                                            <div className={`p-4 rounded-lg border ${
                                                isManual ? 'bg-indigo-900/10 border-indigo-900/30' :
                                                isSafe ? 'bg-emerald-900/10 border-emerald-900/20' : 'bg-red-900/10 border-red-900/20'
                                            }`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-sm font-mono text-slate-400">{formatTime(log.timestamp)}</span>
                                                    <span className={`text-xs px-2 py-1 rounded font-bold flex items-center gap-1 ${
                                                        isManual ? 'bg-indigo-900/50 text-indigo-300' :
                                                        isSafe ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/40 text-red-400'
                                                    }`}>
                                                        {isManual ? (isSafe ? <LockOpen className="w-4 h-4"/> : <LockKeyhole className="w-4 h-4"/>) 
                                                        : isSafe ? <ShieldCheck className="w-4 h-4"/> : <ShieldAlert className="w-4 h-4"/>}
                                                        
                                                        {isManual ? 'LỆNH ADMIN' : isSafe ? 'TRUY CẬP HỢP LỆ' : 'CẢNH BÁO'}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-slate-200">
                                                    {log.message}
                                                    <div className="text-slate-500 mt-1 font-mono text-xs">IP Ghi nhận: {log.ip_address}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default LogHistory;