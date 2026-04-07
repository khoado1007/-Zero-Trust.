import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Terminal } from 'lucide-react';

const LiveRadar = () => {
    const [logs, setLogs] = useState([]);
    const logEndRef = useRef(null);

    useEffect(() => {
        const socket = io('http://localhost:3000');
        socket.on('security_log', (data) => {
            setLogs((prevLogs) => [...prevLogs, data]);
        });
        return () => socket.disconnect();
    }, []);

    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    return (
        <div className="w-full max-w-5xl mx-auto mt-2">
            <div className="flex items-center gap-2 mb-4">
                <Terminal className="text-cyan-400 w-6 h-6" />
                <h2 className="text-xl font-bold text-slate-200">Live Security Radar</h2>
            </div>

            {/* CÁI HỘP TERMINAL ĐƯỢC ÉP CSS TRỰC TIẾP */}
            <div 
                style={{ height: '500px', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #334155', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}
            >
                {/* 1. Thanh Tiêu Đề */}
                <div style={{ backgroundColor: '#1e1e1e', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #000' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff5f56' }}></div>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffbd2e' }}></div>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#27c93f' }}></div>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace', letterSpacing: '1px' }}>
                        root@zerotrust-core:~
                    </div>
                    <div style={{ width: '40px' }}></div>
                </div>

                {/* 2. Màn Hình Đen Chứa Log (Khu vực cuộn) */}
                <div style={{ backgroundColor: '#050505', padding: '16px', flex: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: '14px', color: '#e2e8f0' }}>
                    
                    {logs.length === 0 ? (
                        <div style={{ color: '#64748b', fontStyle: 'italic' }}>
                            $ Đang chờ tín hiệu từ các Agents...
                        </div>
                    ) : (
                        logs.map((log, index) => (
                            <div key={index} style={{ marginBottom: '8px', display: 'flex', gap: '12px', lineHeight: '1.5' }}>
                                {/* Cột thời gian */}
                                <div style={{ color: '#64748b', whiteSpace: 'nowrap' }}>
                                    [{log.time}]
                                </div>
                                
                                {/* Cột nội dung */}
                                <div style={{ flex: 1 }}>
                                    {log.status === 'SAFE' || log.type === 'SAFE' ? (
                                        <span style={{ color: '#10b981', fontWeight: 'bold', marginRight: '8px' }}>[SAFE]</span>
                                    ) : (
                                        <span style={{ color: '#ef4444', fontWeight: 'bold', marginRight: '8px' }}>[CRITICAL]</span>
                                    )}
                                    
                                    <span style={{ color: '#22d3ee', fontWeight: 'bold', marginRight: '8px' }}>
                                        {log.device_id}:
                                    </span>
                                    
                                    <span style={{ color: log.status === 'SAFE' || log.type === 'SAFE' ? '#d1fae5' : '#fecaca' }}>
                                        {log.message}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                    
                    {/* Điểm neo để tự động kéo xuống đáy */}
                    <div ref={logEndRef} style={{ height: '4px' }}></div>
                </div>
            </div>
        </div>
    );
};

export default LiveRadar;