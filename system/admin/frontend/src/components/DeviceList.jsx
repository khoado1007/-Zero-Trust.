import { useState, useEffect } from 'react';
import { ShieldAlert, Lock, Laptop, User, Clock, Trash2, UserPlus } from 'lucide-react';
import { io } from 'socket.io-client';

const DeviceList = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [formData, setFormData] = useState({ fullName: '', employeeId: '', department: 'SALES' });
    const [assignLoading, setAssignLoading] = useState(false);

    const fetchDevices = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/v1/devices');
            if (!response.ok) {
                throw new Error(`Lỗi Server: ${response.status}`);
            }
            const data = await response.json();
            console.log('[DEBUG DeviceList fetchDevices] Raw data:', data);
            if (Array.isArray(data)) {
                console.log('[DEBUG DeviceList] JIT fields sample:', data.slice(0,2).map(d => ({deviceId: d.deviceId, status:d.status, requestStatus:d.requestStatus, jitHours:d.jitHours, requestTimestamp:d.requestTimestamp})));
                setDevices(data);
            } else {
                setDevices([]);
                setErrorMsg("Dữ liệu trả về không đúng định dạng.");
            }

        } catch (error) {
            console.error("Lỗi khi tải danh sách thiết bị:", error);
            setErrorMsg("Không thể kết nối đến Backend Node.js. Hãy kiểm tra xem Server đã bật chưa!");
            setDevices([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    useEffect(() => {
        const socket = io('http://localhost:3000');
        socket.on('device_updated', (updatedDevice) => {
            setDevices(prev => prev?.map(dev => dev.id === updatedDevice.id ? { ...dev, ...updatedDevice } : dev));
        });
        socket.on('device_deleted', (payload) => {
            setDevices(prev => prev?.filter(dev => dev.id !== payload.id));
        });
        return () => socket.disconnect();
    }, []);

    const handleLockDevice = async (id, deviceName) => {
        if (!window.confirm(`⚠️ Bạn có chắc chắn muốn KHÓA KHẨN CẤP thiết bị [${deviceName}] không?`)) return;
        try {
            const response = await fetch(`http://localhost:3000/api/v1/devices/${id}/lock`, { method: 'PUT' });
            if (response.ok) {
                setDevices(prevDevices => prevDevices.map(device => 
                    device.id === id ? { ...device, status: 'LOCKED' } : device
                ));
                alert(`✅ Đã phát lệnh phong tỏa đến máy ${deviceName}`);
            }
        } catch (error) {
            console.error("Lỗi khi khóa thiết bị:", error);
        }
    };

    const handleUnlockDevice = async (id, deviceName) => {
        if (!window.confirm(`🛡️ Xác nhận gỡ phong tỏa cho thiết bị [${deviceName}]?`)) return;
        try {
            const response = await fetch(`http://localhost:3000/api/v1/devices/${id}/unlock`, { method: 'PUT' });
            if (response.ok) {
                setDevices(prevDevices => prevDevices.map(device => 
                    device.id === id ? { ...device, status: 'SAFE' } : device
                ));
                alert(`✅ Đã khôi phục truy cập cho máy ${deviceName}`);
            }
        } catch (error) {
            console.error("Lỗi khi mở khóa thiết bị:", error);
        }
    };

    const handleDeleteDevice = async (id, deviceName) => {
        if (!window.confirm(`🚨 CẢNH BÁO: Bạn có chắc chắn muốn XÓA thiết bị [${deviceName}] khỏi hệ thống không?`)) return;
        try {
            const response = await fetch(`http://localhost:3000/api/v1/devices/${id}`, { method: 'DELETE' });
            if (response.ok) {
                setDevices(prevDevices => prevDevices.filter(device => device.id !== id));
                alert(`✅ Đã xóa thiết bị ${deviceName} khỏi hệ thống.`);
            } else {
                alert(`❌ Lỗi khi xóa thiết bị.`);
            }
        } catch (error) {
            console.error("Lỗi khi xóa thiết bị:", error);
        }
    };

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
                setDevices(prevDevices => prevDevices.map(device => 
                    device.id === id ? { ...device, isRemoteAllowed: newStatus } : device
                ));
                fetchDevices();
            } else {
                alert('Lỗi khi cập nhật quyền Remote');
            }
        } catch (error) {
            console.error("Lỗi khi toggle remote access:", error);
            alert('Không thể kết nối đến server');
        }
    };

const handleApproveJIT = async (deviceId, deviceName) => {
        const hours = window.prompt(`⏳ Nhập số giờ cấp phép (JIT) cho [${deviceName}]:`, "2");
        if (!hours) return;
        const reason = window.prompt(`📝 Nhập lý do cấp phép cho [${deviceName}]:`, "Làm việc remote tạm thời");
        if (!reason) return;
        try {
            const response = await fetch(`http://localhost:3000/api/v1/devices/approve-jit`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId: deviceId, jitHours: parseInt(hours, 10), reason })
            });
            if (response.ok) {
                // Socket will update UI immediately with full data incl. requestTimestamp
                alert(`✅ Đã cấp quyền JIT ${hours}h cho máy ${deviceName}`);
            } else {

                const errData = await response.json().catch(() => ({}));
                alert(`❌ ${errData.error || 'Lỗi khi cấp quyền JIT từ Backend'}`);
            }
        } catch (error) {
            console.error("Lỗi khi duyệt JIT:", error);
        }
    };

    const handleSetDepartment = async (id, newDept) => {
        try {
            const response = await fetch(`http://localhost:3000/api/v1/devices/${id}/set-department`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ department: newDept })
            });
            if (response.ok) {
                setDevices(prevDevices => prevDevices.map(device => 
                    device.id === id ? { ...device, department: newDept } : device
                ));
                alert(`Đã cập nhật phòng ban: ${newDept}`);
            } else {
                alert('Lỗi cập nhật phòng ban');
            }
        } catch (error) {
            console.error("Lỗi khi cập nhật phòng ban:", error);
            alert('Không thể kết nối đến server');
        }
    };

    const openAssignModal = (device) => {
        if (device.user) {
            alert('Thiết bị đã có nhân sự được gán!');
            return;
        }
        setSelectedDevice(device);
        setFormData({ fullName: '', employeeId: '', department: device.department || 'SALES' });
        setShowAssignModal(true);
    };

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAssignUser = async (e) => {
        e.preventDefault();
        if (!formData.fullName.trim() || !formData.employeeId.trim()) {
            alert('Vui lòng nhập Họ và Tên và Mã nhân viên!');
            return;
        }

        setAssignLoading(true);
        try {
            const response = await fetch(`http://localhost:3000/api/v1/devices/${selectedDevice.id}/assign-user`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const result = await response.json();
                setDevices(prev => prev.map(d => d.id === selectedDevice.id ? result.device : d));
                setShowAssignModal(false);
                alert('✅ Đã gán nhân sự thành công!');
            } else {
                const err = await response.json();
                alert(`❌ Lỗi: ${err.error || 'Không thể gán nhân sự'}`);
            }
        } catch (error) {
            console.error('Assign error:', error);
            alert('Lỗi kết nối server');
        } finally {
            setAssignLoading(false);
        }
    };

    if (loading) return <div className="text-cyan-400 animate-pulse text-center mt-10">Đang đồng bộ dữ liệu với PostgreSQL...</div>;

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
                                                {device.user ? (
                                                    <>
                                                        <div className="font-semibold text-slate-200">{device.user.fullName} ({device.user.employeeId})</div>
                                                        <div className="text-xs text-slate-500 font-mono mt-0.5">{device.user.role || 'UNKNOWN'}</div>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => openAssignModal(device)}
                                                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                                                        title="Gán nhân sự (Click để mở popup)"
                                                    >
                                                        <UserPlus className="w-4 h-4" />
                                                        Chưa định danh
                                                    </button>
                                                )}
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
                                        {device.status === 'SAFE' && device.requestStatus === 'APPROVED' && device.jitHours && device.requestTimestamp ? (
                                          (() => {
                                            const exp = new Date(device.requestTimestamp).getTime() + (device.jitHours * 60 * 60 * 1000);
                                            const diff = Math.max(0, exp - Date.now());
                                            const h = Math.floor(diff / 3600000);
                                            const m = Math.floor((diff % 3600000) / 60000);
                                            const remaining = diff > 0 ? `${h}h ${m}m` : 'EXPIRED';
                                            console.log(`[JIT UI] ${device.deviceId}: remaining ${remaining}`);
                                            return (
                                              <div className="space-y-1">
                                                <span className="flex items-center gap-1 w-fit px-2 py-1 rounded text-xs font-bold bg-amber-900/30 text-amber-400 border border-amber-800/50">
                                                  <Clock className="w-3 h-3" />
                                                  JIT Active
                                                </span>
                                                <span className="text-xs font-mono bg-amber-900/50 text-amber-300 px-2 py-0.5 rounded-full">
                                                  {remaining}
                                                </span>
                                              </div>
                                            );
                                          })()
                                        ) : (
                                          <span className={`flex items-center gap-1 w-fit px-2 py-1 rounded text-xs font-bold ${
                                            device.status === 'SAFE' 
                                            ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50' 
                                            : 'bg-red-900/40 text-red-400 border border-red-800/50'
                                          }`}>
                                            {device.status === 'SAFE' ? <ShieldAlert className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                            {device.status}
                                          </span>
                                        )}
                                    </td>

                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {device.status === 'LOCKED' ? (
                                                <>
                                                    <button 
onClick={() => handleApproveJIT(device.deviceId, device.deviceName)}
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

            {showAssignModal && selectedDevice && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                                <UserPlus className="w-6 h-6 text-blue-400" />
                                Gán nhân sự cho {selectedDevice.deviceId}
                            </h3>
                            <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleAssignUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Họ và Tên</label>
                                <input
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleFormChange}
                                    className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Nguyễn Văn A"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Mã nhân viên</label>
                                <input
                                    name="employeeId"
                                    value={formData.employeeId}
                                    onChange={handleFormChange}
                                    className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                    placeholder="NV001"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Phòng ban</label>
                                <select
                                    name="department"
                                    value={formData.department}
                                    onChange={handleFormChange}
                                    className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="SALES">SALES (Nghiêm ngặt)</option>
                                    <option value="SOCIAL">SOCIAL (Linh hoạt)</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={assignLoading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {assignLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Đang gán...
                                    </>
                                ) : (
                                    'Gán nhân sự'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeviceList;
