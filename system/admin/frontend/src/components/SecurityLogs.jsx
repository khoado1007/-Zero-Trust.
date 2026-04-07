import { useState, useEffect } from 'react';
import { RefreshCw, ShieldAlert, ShieldCheck, AlertCircle, Clock, HardDrive } from 'lucide-react';

const SecurityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/v1/logs');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setLogs(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Fetch logs error:', err);
      setError('Không thể tải dữ liệu logs. Kiểm tra backend server.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status, action_taken) => {
    const text = status || (action_taken?.toLowerCase().includes('lock') ? 'LOCKED' : 'UNKNOWN');
    const isCritical = text.includes('CRITICAL') || text.includes('LOCKED');
    const isSafe = text.includes('SAFE') || text.includes('INFO') || text.includes('Allow') || text.includes('ALLOWED');
    
    if (action_taken === 'JIT_APPROVED') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          JIT APPROVED
        </span>
      );
    }
    
    if (isCritical) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {text}
        </span>
      );
    } else if (isSafe) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          {text}
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {text}
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 shadow-2xl h-[calc(100vh-140px)] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin" />
        <div className="text-white text-lg font-bold">Đang tải dữ liệu...</div>
        <div className="text-gray-400 text-sm">Đồng bộ logs từ MongoDB</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl h-[calc(100vh-140px)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-700 bg-gray-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HardDrive className="w-8 h-8 text-cyan-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Lịch sử cảnh báo</h2>
              <p className="text-gray-400 text-sm">100 logs mới nhất từ MongoDB</p>
            </div>
          </div>
          <button
            onClick={fetchLogs}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-300 hover:text-cyan-400"
            title="Làm mới"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-8 flex items-center justify-center">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center max-w-md">
            <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-red-400 mb-2">Lỗi tải dữ liệu</h3>
            <p className="text-red-300 mb-4">{error}</p>
            <button
              onClick={fetchLogs}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg transition-all font-medium"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!error && logs.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <ShieldCheck className="w-20 h-20 text-gray-500 mx-auto" />
            <div className="text-white text-xl font-bold">Chưa có cảnh báo nào</div>
            <div className="text-gray-400 text-sm">Hệ thống sẽ tự động cập nhật khi có sự kiện bảo mật mới.</div>
          </div>
        </div>
      )}

      {/* Logs Table */}
      {!error && logs.length > 0 && (
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-600">
              <tr>
                <th className="p-4 text-left font-bold text-white text-sm uppercase tracking-wider w-32">Thời gian</th>
                <th className="p-4 text-left font-bold text-white text-sm uppercase tracking-wider w-48">Thiết bị</th>
                <th className="p-4 text-left font-bold text-white text-sm uppercase tracking-wider w-32">IP</th>
                <th className="p-4 text-left font-bold text-white text-sm uppercase tracking-wider w-28">Trạng thái</th>
                <th className="p-4 text-left font-bold text-white text-sm uppercase tracking-wider flex-1">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-gray-700/50 transition-colors">
                  <td className="p-4 text-gray-300 font-mono text-sm">
                    {new Date(log.timestamp).toLocaleString('vi-VN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </td>
                  <td className="p-4 text-cyan-400 font-mono text-sm font-medium max-w-[200px] truncate">
                    {log.device_id}
                  </td>
                  <td className="p-4 text-gray-400 font-mono text-sm">
                    {log.ip_address}
                  </td>
                  <td className="p-4">
                    {getStatusBadge(log.status, log.action_taken)}
                  </td>
                  <td className="p-4 max-w-lg">
                    <div className="text-gray-300 text-sm leading-relaxed break-words" title={log.message}>
                      {log.message || 'N/A'}
                    </div>
                    {log.action_taken && (
                      <div className="text-xs text-gray-500 mt-1 font-mono">
                        Hành động: {log.action_taken}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SecurityLogs;

