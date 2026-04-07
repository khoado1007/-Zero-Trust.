import React, { useState, useEffect } from 'react';

const NetworkRules = () => {
    const [ipList, setIpList] = useState([]);
    const [newIp, setNewIp] = useState('');
    const [description, setDescription] = useState('');

    // 1. Lấy dữ liệu từ Database khi mở trang
    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/v1/network-rules');
            const data = await response.json();
            setIpList(data);
        } catch (error) {
            console.error("Lỗi tải danh sách IP:", error);
        }
    };

    // 2. Thêm IP mới vào Database
    const handleAddIp = async (e) => {
        e.preventDefault();
        if (!newIp) return;
        
        try {
            const response = await fetch('http://localhost:3000/api/v1/network-rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip: newIp, description })
            });

            if (response.ok) {
                const newRule = await response.json();
                setIpList([newRule, ...ipList]);
                setNewIp('');
                setDescription('');
            } else {
                const errorData = await response.json();
                alert(errorData.error);
            }
        } catch (error) {
            console.error("Lỗi thêm IP:", error);
        }
    };

    // 3. Xóa IP khỏi Database
    const handleRemoveIp = async (id, ipAddress) => {
        if(window.confirm(`⚠️ Ngắt kết nối toàn bộ thiết bị đang dùng IP [${ipAddress}]?`)) {
            try {
                const response = await fetch(`http://localhost:3000/api/v1/network-rules/${id}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    setIpList(ipList.filter(rule => rule.id !== id));
                }
            } catch (error) {
                console.error("Lỗi xóa IP:", error);
            }
        }
    };

    return (
        <div className="p-4 text-white">
            <h2 className="text-2xl font-bold mb-4 text-blue-400">🛡️ Quản lý Quy tắc Mạng (IP Whitelist)</h2>
            <p className="mb-6 text-gray-300">Chỉ những thiết bị có IP nằm trong danh sách này mới được phép truy cập vào hệ thống.</p>

            {/* Form thêm IP */}
            <form onSubmit={handleAddIp} className="bg-gray-800 p-4 rounded-lg mb-8 flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm mb-1 text-gray-400">Địa chỉ IP an toàn</label>
                    <input 
                        type="text" 
                        placeholder="VD: 192.168.1.100" 
                        className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                        value={newIp}
                        onChange={(e) => setNewIp(e.target.value)}
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-sm mb-1 text-gray-400">Mô tả (Tùy chọn)</label>
                    <input 
                        type="text" 
                        placeholder="VD: Mạng LAN Công ty" 
                        className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold transition-colors">
                    + Thêm IP
                </button>
            </form>

            {/* Bảng danh sách */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-700">
                        <tr>
                            <th className="p-3">Địa chỉ IP</th>
                            <th className="p-3">Mô tả</th>
                            <th className="p-3">Trạng thái</th>
                            <th className="p-3 text-center">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ipList.map((rule) => (
                            <tr key={rule.id} className="border-t border-gray-700 hover:bg-gray-750">
                                <td className="p-3 font-mono text-green-400">{rule.ip}</td>
                                <td className="p-3 text-gray-300">{rule.description}</td>
                                <td className="p-3">
                                    <span className="bg-green-900 text-green-200 px-2 py-1 rounded text-xs font-bold">
                                        {rule.status}
                                    </span>
                                </td>
                                <td className="p-3 text-center">
                                    <button onClick={() => handleRemoveIp(rule.id, rule.ip)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-bold transition-colors">
                                        Xóa
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {ipList.length === 0 && (
                            <tr>
                                <td colSpan="4" className="p-6 text-center text-gray-500">
                                    Chưa có IP nào trong danh sách. Hệ thống đang chặn tất cả kết nối!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default NetworkRules;
