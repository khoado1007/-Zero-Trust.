# ZeroTrust - Enterprise Endpoint Security Platform

[![Status](https://img.shields.io/badge/status-beta-yellow)](https://github.com)

## 🚀 Overview

ZeroTrust is a comprehensive **Zero Trust security platform** for enterprise endpoint management. It implements strict access controls with device tracking, IP whitelisting, real-time security logging, and automatic screen locking on threats.

**Key Principles:**
- Never trust, always verify
- Device registration & periodic health checks
- Network access rules (IP-based)
- Real-time monitoring dashboard

## 🏗️ Architecture

```
Windows/Linux Agents ──(Socket.io/HTTPS)──> Node.js Backend ──(Prisma/Postgres)──> React Dashboard
                                    │
                              ├─ MongoDB (Security Logs)
                              └─ Postgres (Devices/Users/Rules)
```

## ✨ Features

- **Device Management**: Register endpoints, track IP/location, status (SAFE/LOCKED/STOLEN)
- **Network Rules**: Whitelist trusted IPs/locations
- **Security Logging**: Real-time logs with CRITICAL alerts triggering agent screen lock
- **Live Dashboard**: React UI with LiveRadar, DeviceList, LogHistory, NetworkRules
- **Agent Capabilities**: Auto-start persistence, 10s pings, silent operation
- **Realtime**: Socket.io bidirectional communication

## 🛠️ Tech Stack

| Component | Technologies |
|-----------|--------------|
| Backend | Node.js, Express, Prisma (Postgres), Mongoose (MongoDB), Socket.io |
| Frontend | React 19, Vite, Tailwind CSS, Lucide Icons |
| Agents | Python 3, socketio, requests, PyInstaller builds |
| Database | PostgreSQL 15, MongoDB 6 |
| Orchestration | Docker Compose |

## ⚡ Quick Start

### Prerequisites
- Docker Desktop
- Node.js 20+
- Python 3.10+
- Windows (for agents)

### 1. Start Databases
```bash
docker-compose up -d
```

### 2. Backend
```bash
cd system/admin/backend
npm install
npx prisma generate
npx prisma db push  # or migrate
npm start
```
Port: 3001

### 3. Frontend
```bash
cd system/admin/frontend
npm install
npm run dev
```
Port: 5173

### 4. Deploy Agent
```bash
# Edit config
notepad system/user/config.json

# Run (UAC prompt)
python system/user/agent.py
```

Verify in dashboard: /devices should show your agent pinging.

### Test Builds
```
test/build/agent_boss/agent_boss.exe
test/build/agent_dev/agent_dev.exe
```

## 📱 Screenshots

![Dashboard](screenshots/dashboard.png)
![Devices](screenshots/devices.png)
![Rules](screenshots/rules.png)

*(Add screenshots after setup)*

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /devices | List devices with status/IP |
| POST | /rules | Add network rule |
| GET | /logs | Security log history |
| POST | /logs | Emit security event (triggers agent lock) |

## 🐍 Agent Setup

1. `pip install requests python-socketio`
2. Update `system/user/config.json`:
   ```json
   {
     \"device_id\": \"YOUR-DEVICE-ID\",
     \"device_name\": \"Your Laptop\"
   }
   ```
3. Run `python system/user/agent.py`
4. Persistence: Added to Registry Run key.

**Features**: Registers, pings every 10s, listens for CRITICAL logs → screen lock.

## 📋 Next Steps

See [TODO.md](TODO.md) for completion status.

## 🚀 Production

- Batch setup: `file setup/setup_admin.bat`
- Custom domains/DB creds
- HTTPS/Socket.io secure
- Multi-tenant users

## 📄 License

MIT - See LICENSE (add if needed)

---

**Built with ❤️ for Zero Trust Security**

# -Zero-Trust.
