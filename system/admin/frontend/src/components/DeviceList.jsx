import { useState, useEffect } from 'react';
import { ShieldAlert, Lock, Laptop, User, Clock, Trash2 } from 'lucide-react';
import { io } from 'socket.io-client';

const DeviceList = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    // Lấy danh sách thiết bị từ Backend (PostgreSQL) an toàn hơn
    const fetchDevices = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/v1/devices');
            
            // Nếu Backend báo lỗi (VD: 500, 404)
            if (!response.ok) {
                throw new Error(`Lỗi Server: ${response.status}`);
            }

            const data = await response.json();
            
            // Khóa an toàn: Đảm bảo dữ liệu chắc chắn là Mảng thì mới cho phép render
            if (Array.isArray(data)) {
                setDevices(data);
            } else {
                setDevices([]);
                setErrorMsg("Dữ liệu trả về không đúng định dạng.");
            }
        } catch (error) {
            console.error("Lỗi khi tải danh sách thiết bị:", error);
            setErrorMsg("Không thể kết nối đến Backend Node.js. Hãy kiểm tra xem Server đã bật chưa!");
            setDevices([]); // Ép về mảng rỗng để không bị crash
        } finally {
            setLoading(false); // Luôn luôn tắt loading dù thành công hay thất bại
        }
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    // --- LẮNG NGHE SOCKET.IO REAL-TIME ---
    useEffect(() => {
        const socket = io('http://localhost:3000');

        socket.on('device_updated', (updatedDevice) => {
            setDevices(prev => prev?.map(dev => dev.id === updatedDevice.id ? { ...dev, ...updatedDevice } : dev));
        });

        socket.on('device_deleted', (payload) => {
            setDevices(prev => prev?.filter(dev => dev.id !== payload.id));
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // --- LỆNH KHÓA: Cập nhật State trực tiếp ---
    const handleLockDevice = async (id, deviceName) => {
        if (!window.confirm(`⚠️ Bạn có chắc chắn muốn KHÓA KHẨN CẤP thiết bị [${deviceName}] không?\nLệnh này sẽ có hiệu lực ngay lập tức!`)) return;

        try {
            const response = await fetch(`http://localhost:3000/api/v1/devices/${id}/lock`, { method: 'PUT' });
            if (response.ok) {
                // ⚡ Phép thuật ở đây: Sửa thẳng vào biến 'devices' đang hiển thị trên màn hình
                setDevices(prevDevices => 
                    prevDevices.map(device => 
                        device.id === id ? { ...device, status: 'LOCKED' } : device
                    )
                );
                alert(`✅ Đã phát lệnh phong tỏa đến máy ${deviceName}`);
            }
        } catch (error) {
            console.error("Lỗi khi khóa thiết bị:", error);
        }
    };

    // --- LỆNH MỞ KHÓA: Cập nhật State trực tiếp ---
    const handleUnlockDevice = async (id, deviceName) => {
        if (!window.confirm(`🛡️ Xác nhận gỡ phong tỏa cho thiết bị [${deviceName}]?`)) return;

        try {
            const response = await fetch(`http://localhost:3000/api/v1/devices/${id}/unlock`, { method: 'PUT' });
            if (response.ok) {
                // ⚡ Phép thuật ở đây: Trả trạng thái về SAFE ngay lập tức
                setDevices(prevDevices => 
                    prevDevices.map(device => 
                        device.id === id ? { ...device, status: 'SAFE' } : device
                    )
                );
                alert(`✅ Đã khôi phục truy cập cho máy ${deviceName}`);
            }
        } catch (error) {
            console.error("Lỗi khi mở khóa thiết bị:", error);
        }
    };

    // --- LỆNH XÓA THIẾT BỊ ---
    const handleDeleteDevice = async (id, deviceName) => {
        if (!window.confirm(`🚨 CẢNH BÁO: Bạn có chắc chắn muốn XÓA thiết bị [${deviceName}] khỏi hệ thống không?\nHành động này không thể hoàn tác!`)) return;

        try {
            const response = await fetch(`http://localhost:3000/api/v1/devices/${id}`, { method: 'DELETE' });
            if (response.ok) {
                // Cập nhật State cục bộ an toàn: Lọc bỏ thiết bị vừa xóa
                setDevices(prevDevices => prevDevices.filter(device => device.id !== id));
                alert(`✅ Đã xóa thiết bị ${deviceName} khỏi hệ thống.`);
            } else {
                alert(`❌ Lỗi khi xóa thiết bị. Vui lòng kiểm tra lại Backend.`);
            }
        } catch (error) {
            console.error("Lỗi khi xóa thiết bị:", error);
        }
    };

    // --- TOGGLE REMOTE ACCESS (VIP) ---
    const toggleRemoteAccess = async (id, deviceName) => {
        if (!window.confirm("Bạn có chắc chắn muốn thay đổi quyền Remote của thiết bị này?")) return;

        try {
            const newStatus = !devices.find(d => d.id === id)?.isRemoteAllowed;
            const response = await fetch(`http://localhost:3000/api/v1/devices/${id}/toggle-remote`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isRemoteAllowed: newStatus })
            });

            if (response.ok) {
                // Optimistic UI update
                setDevices(prevDevices => 
                    prevDevices.map(device => 
                        device.id === id ? { ...device, isRemoteAllowed: newStatus } : device
                    )
                );
                // Refetch to sync with DB
                fetchDevices();
            } else {
                alert('Lỗi khi cập nhật quyền Remote');
            }
        } catch (error) {
            console.error("Lỗi khi toggle remote access:", error);
            alert('Không thể kết nối đến server');
        }
    };

    // --- LỆNH DUYỆT JIT (JUST-IN-TIME ACCESS) ---
    const handleApproveJIT = async (id, deviceName) => {
        const hours = window.prompt(`⏳ Nhập số giờ cấp phép (JIT) cho [${deviceName}]:`, "2");
        if (!hours) return;
        
        const reason = window.prompt(`📝 Nhập lý do cấp phép cho [${deviceName}]:`, "Làm việc remote tạm thời");
        if (!reason) return;

        try {
            const response = await fetch(`http://localhost:3000/api/v1/devices/${id}/approve-jit`, { 
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jitHours: parseInt(hours, 10), reason })
            });
            
            if (response.ok) {
                // Cập nhật State cục bộ an toàn, Socket.IO cũng sẽ emit để backup
                setDevices(prevDevices => 
                    (prevDevices || []).map(device => 
                        device.id === id ? { ...device, status: 'SAFE', jitHours: parseInt(hours, 10) } : device
                    )
                );
                alert(`✅ Đã cấp quyền JIT ${hours}h cho máy ${deviceName}`);
            } else {
                alert(`❌ Lỗi khi cấp quyền JIT từ Backend. Hãy kiểm tra lại Controller.`);
            }
        } catch (error) {
            console.error("Lỗi khi duyệt JIT:", error);
        }
    };

    // --- SET DEPARTMENT ---
    const handleSetDepartment = async (id, newDept) => {
        try {
            const response = await fetch(`http://localhost:3000/api/v1/devices/${id}/set-department`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ department: newDept })
            });
            if (response.ok) {
                setDevices(prevDevices => 
                    prevDevices.map(device => 
                        device.id === id ? { ...device, department: newDept } : device
                    )
                );
                alert(`Đã cập nhật phòng ban: ${newDept}`);
            } else {
                alert('Lỗi cập nhật phòng ban');
            }
        } catch (error) {
            console.error("Lỗi khi cập nhật phòng ban:", error);
            alert('Không thể kết nối đến server');
        }
    };

    if (loading) return <div className="text-cyan-400 animate-pulse text-center mt-10">Đang đồng bộ dữ liệu với PostgreSQL...</div>;

    // Nếu có lỗi, hiển thị thông báo lỗi thay vì crash banh màn hình
    if (errorMsg) return <div className="text-red-500 font-bold text-center mt-10 border border-red-500 p-4 rounded bg-red-900/20">{errorMsg}</div>;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl animate-[fadeIn_0.4s_ease-out]">
            <h2 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-2">
                <Laptop className="text-cyan-400 w-6 h-6" />
                Danh sách Agents & Thiết bị
            </h2>

            <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-800 text-slate-400 text-sm uppercase tracking-wider border-b border-slate-700">
                            <th className="p-4 font-semibold">Nhân sự</th>
                            <th className="p-4 font-semibold">Phòng ban</th>
                            <th className="p-4 font-semibold">Thiết bị (MAC/ID)</th>
                            <th className="p-4 font-semibold">Quyền Remote</th>
                            <th className="p-4 font-semibold">Trạng thái DB</th>
                            <th className="p-4 font-semibold text-right">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-slate-300 bg-slate-900">
                        {/* Render an toàn: Kiểm tra nếu mảng rỗng thì báo Không có dữ liệu */}
                        {devices.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-slate-500 italic">Chưa có thiết bị nào trong hệ thống.</td></tr>
                        ) : (
                            devices.map((device) => (
                                <tr key={device.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-800 rounded-full border border-slate-700">
                                                <User className="w-4 h-4 text-cyan-400" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-200">{device.user?.fullName || 'Chưa định danh'}</div>
                                                <div className="text-xs text-slate-500 font-mono mt-0.5">{device.user?.role || 'UNKNOWN'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <select 
                                            value={device.department || 'SALES'}
                                            onChange={(e) => handleSetDepartment(device.id, e.target.value)}
                                            className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="SALES">SALES (Nghiêm ngặt)</option>
                                            <option value="SOCIAL">SOCIAL (Linh hoạt)</option>
                                        </select>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {device.department === 'SALES' ? '⚠️ Strict' : '✅ Flexible'}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-mono text-cyan-400 font-bold">{device.deviceId}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">{device.deviceName}</div>
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => toggleRemoteAccess(device.id, device.deviceName)}
                                            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all border ${
                                                device.isRemoteAllowed
                                                    ? 'bg-purple-600/20 text-purple-300 border-purple-600/50 hover:bg-purple-600/40 hover:shadow-[0_0_10px_rgba(147,51,234,0.3)] hover:text-white'
                                                    : 'bg-gray-600/20 text-gray-300 border-gray-600/50 hover:bg-gray-600/40 hover:shadow-[0_0_10px_rgba(75,85,99,0.3)]'
                                            }`}
                                        >
                                            {device.isRemoteAllowed ? '⭐ VIP Remote' : '🔒 Local Only'}
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <span className={`flex items-center gap-1 w-fit px-2 py-1 rounded text-xs font-bold ${
                                            device.status === 'SAFE' 
                                            ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50' 
                                            : 'bg-red-900/40 text-red-400 border border-red-800/50'
                                        }`}>
                                            {device.status === 'SAFE' ? <ShieldAlert className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                            {device.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {device.status === 'LOCKED' ? (
                                                <>
                                                    <button 
                                                        onClick={() => handleApproveJIT(device.id, device.deviceName)}
                                                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-blue-600/20 text-blue-400 border border-blue-600/50 hover:bg-blue-600 hover:text-white hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                                                    >
                                                        <Clock className="w-4 h-4" />
                                                        Duyệt JIT
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUnlockDevice(device.id, device.deviceName)}
                                                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-emerald-600/20 text-emerald-400 border border-emerald-600/50 hover:bg-emerald-600 hover:text-white hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                                                    >
                                                        <ShieldAlert className="w-4 h-4" />
                                                        Mở Khóa
                                                    </button>
                                                </>
                                            ) : (
                                                <button 
                                                    onClick={() => handleLockDevice(device.id, device.deviceName)}
                                                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-red-600/20 text-red-400 border border-red-600/50 hover:bg-red-600 hover:text-white hover:shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                                                >
                                                    <Lock className="w-4 h-4" />
                                                    Khóa Khẩn Cấp
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleDeleteDevice(device.id, device.deviceName)}
                                                className="flex items-center justify-center p-2 rounded-lg transition-all bg-gray-600/20 text-gray-400 border border-gray-600/50 hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                                                title="Xóa thiết bị này"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DeviceList;
