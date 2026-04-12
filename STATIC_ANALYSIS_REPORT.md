# Báo cáo Static Code Analysis

## 1. ARCHITECTURE OVERVIEW

### Mục đích dự án
- Đây là nền tảng Zero Trust cho endpoint doanh nghiệp: agent trên máy người dùng gửi heartbeat/đăng ký thiết bị, backend kiểm tra chính sách truy cập và phát sự kiện bảo mật realtime cho dashboard. (README mô tả kiến trúc tổng thể Agent → Backend → DB → Frontend).【F:README.md†L7-L20】

### Core Tech Stack & Dependencies
- **Backend**: Node.js + Express + Socket.IO + Prisma + Mongoose.【F:system/admin/backend/package.json†L1-L23】
- **Frontend**: React (Vite) + Socket.IO client + Tailwind + Lucide icon.【F:system/admin/frontend/package.json†L1-L33】
- **Agent**: Python (`requests`, `socketio`, `winreg`, `ctypes`) chạy trên Windows và thao tác registry/lock workstation.【F:system/user/agent.py†L1-L12】【F:system/user/agent.py†L56-L67】【F:system/user/agent.py†L196-L203】
- **Data layer**: PostgreSQL cho thực thể User/Device/NetworkRule và MongoDB cho SecurityLog.【F:system/admin/backend/prisma/schema.prisma†L12-L66】【F:system/admin/backend/src/models/nosql/SecurityLog.js†L3-L10】

### Design Pattern nhận diện
- Dự án đang đi theo hướng **Layered + Clean Architecture hybrid** (controller/usecase/repository/DI container), nhưng triển khai chưa nhất quán:
  - Có lớp DI `Container` và tách persistence adapter Prisma/Mongo.【F:system/admin/backend/src/infrastructure/di/Container.js†L1-L31】
  - Tuy nhiên controller vẫn truy cập Prisma trực tiếp, bỏ qua use case/repository ở nhiều luồng chính.【F:system/admin/backend/src/controllers/DeviceController.js†L45-L47】【F:system/admin/backend/src/controllers/DeviceController.js†L429-L431】

## 2. DATA FLOW & ENTRY POINTS

### Tương tác cốt lõi giữa module
1. **Agent → Backend REST**
   - Agent gọi `POST /api/v1/devices/register` và `POST /api/v1/devices/check-access`.【F:system/user/agent.py†L96-L110】
2. **Backend policy engine**
   - `DeviceController.checkAccess` tải device + network rules, cập nhật trạng thái/warning, ghi log và trả lệnh khóa/mở cho agent.【F:system/admin/backend/src/controllers/DeviceController.js†L37-L55】【F:system/admin/backend/src/controllers/DeviceController.js†L95-L105】【F:system/admin/backend/src/controllers/DeviceController.js†L133-L149】
3. **Realtime channel**
   - Backend phát sự kiện `security_log`, `device_updated`, `device_deleted`; frontend subscribe qua Socket.IO để cập nhật UI realtime.【F:system/admin/backend/src/controllers/DeviceController.js†L232-L233】【F:system/admin/backend/src/controllers/DeviceController.js†L325-L326】【F:system/admin/backend/src/controllers/DeviceController.js†L361-L362】【F:system/admin/frontend/src/components/DeviceList.jsx†L45-L53】
4. **Frontend API read/write**
   - DeviceList/NetworkRules/LogHistory gọi trực tiếp REST API `localhost:3000` để thao tác dữ liệu.【F:system/admin/frontend/src/components/DeviceList.jsx†L15-L22】【F:system/admin/frontend/src/components/NetworkRules.jsx†L13-L17】【F:system/admin/frontend/src/components/LogHistory.jsx†L16-L25】

### Entry points (file/function cụ thể)
- **Backend entry point**: `system/admin/backend/server.js` khởi tạo `ServerConfig`, `AppServer`, mount router và `listen()`.【F:system/admin/backend/server.js†L1-L31】
- **Frontend entry point**: `system/admin/frontend/src/main.jsx` render `<App />`.【F:system/admin/frontend/src/main.jsx†L1-L10】
- **Agent entry point**: `system/user/agent.py` hàm `main()` + `if __name__ == "__main__"`.【F:system/user/agent.py†L168-L214】

### Luồng state management / database integration
- Frontend dùng state cục bộ bằng `useState`/`useEffect` (không có Redux/Zustand), state đồng bộ qua fetch + socket events.【F:system/admin/frontend/src/App.jsx†L11-L22】【F:system/admin/frontend/src/components/DeviceList.jsx†L6-L13】【F:system/admin/frontend/src/components/DeviceList.jsx†L45-L53】
- Backend ghi/đọc PostgreSQL bằng Prisma model (`Device`, `User`, `NetworkRule`) và MongoDB bằng Mongoose (`SecurityLog`).【F:system/admin/backend/prisma/schema.prisma†L27-L66】【F:system/admin/backend/src/models/nosql/SecurityLog.js†L3-L12】

## 3. CODE QUALITY & SMELLS

### Đánh giá SOLID/DRY
- **SRP vi phạm mạnh ở `DeviceController`**: vừa xử lý policy, DB I/O, audit logging, socket broadcast, validation trong một class >400 dòng; cyclomatic complexity cao nhất tại `checkAccess()` do nhiều nhánh điều kiện lồng nhau.【F:system/admin/backend/src/controllers/DeviceController.js†L37-L155】
- **DIP chưa nhất quán**: có DI container nhưng controller vẫn new/use trực tiếp `SecurityLogger` và Prisma thay vì interface/usecase xuyên suốt.【F:system/admin/backend/src/controllers/DeviceController.js†L17-L19】【F:system/admin/backend/src/infrastructure/di/Container.js†L17-L24】
- **DRY issues**: logic cập nhật trạng thái thiết bị và reset JIT được lặp ở `checkAccess`, `unlockDevice`, `approveJIT` thay vì hàm dùng chung/service domain.【F:system/admin/backend/src/controllers/DeviceController.js†L110-L119】【F:system/admin/backend/src/controllers/DeviceController.js†L214-L223】【F:system/admin/backend/src/controllers/DeviceController.js†L305-L315】

### Code smell/độ phức tạp cao (file/line cụ thể)
- `DeviceController.checkAccess` có nhiều nhánh lock/JIT/network policy/warning trong một hàm (khó test, khó bảo trì).【F:system/admin/backend/src/controllers/DeviceController.js†L37-L155】
- `DeviceTable.jsx` dùng biến chưa khai báo (`socket`, `setDevices`) ngay trong component, gây crash/runtime reference error.【F:system/admin/frontend/src/components/DeviceTable.jsx†L53-L59】
- `DeviceTable.jsx` dùng `Math.random()` cho React `key`, phá vỡ reconciliation và gây re-render không cần thiết.【F:system/admin/frontend/src/components/DeviceTable.jsx†L91-L92】
- `DeviceTable.jsx` dựng class Tailwind động dạng template string `bg-${color}-...`, thường không được Tailwind scan đầy đủ khi build production (styling không ổn định).【F:system/admin/frontend/src/components/DeviceTable.jsx†L121-L124】

## 4. VULNERABILITIES & BUGS

### Security flaws
1. **Thiếu xác thực/ủy quyền cho endpoint nhạy cảm**
   - Các route lock/unlock/delete/approve-jit/assign-user được expose trực tiếp, không thấy middleware auth/role-check trước khi thao tác thiết bị người dùng.【F:system/admin/backend/src/controllers/DeviceController.js†L24-L35】
2. **CORS quá mở (`*`) + socket không auth**
   - API và Socket.IO cho phép mọi origin, tăng nguy cơ cross-origin abuse trên môi trường production.【F:system/admin/backend/src/core/AppServer.js†L11-L13】【F:system/admin/backend/src/core/AppServer.js†L19-L21】
3. **Hard-coded credentials trong Docker compose**
   - Username/password DB ở dạng plaintext (`admin/password123`) trong repo.【F:docker-compose.yml†L10-L12】【F:docker-compose.yml†L24-L25】
4. **Thiếu validate đầu vào IP ở API whitelist**
   - `addRule` nhận `ip` và ghi DB trực tiếp, không regex/parse IPv4/IPv6, dễ lưu dữ liệu rác và phá policy matching.【F:system/admin/backend/src/controllers/NetworkRulesController.js†L37-L41】

### Logical bugs
1. **`this.config` undefined trong `DeviceController`**
   - Constructor không gán `this.config`, nhưng nhiều hàm gọi `this.config.getPrisma()` -> lỗi runtime khi lock/unlock/setDepartment/toggleRemote/approveJIT/delete/assignUser.【F:system/admin/backend/src/controllers/DeviceController.js†L12-L19】【F:system/admin/backend/src/controllers/DeviceController.js†L172-L173】【F:system/admin/backend/src/controllers/DeviceController.js†L198-L199】【F:system/admin/backend/src/controllers/DeviceController.js†L251-L252】【F:system/admin/backend/src/controllers/DeviceController.js†L271-L272】【F:system/admin/backend/src/controllers/DeviceController.js†L297-L297】【F:system/admin/backend/src/controllers/DeviceController.js†L349-L349】【F:system/admin/backend/src/controllers/DeviceController.js†L383-L383】
2. **Mismatch payload Agent ↔ Backend (đăng ký/heartbeat có thể fail)**
   - Agent gửi `current_ip` + `device_name`, trong khi backend đọc `ip` + `originalName`; dẫn đến `400 Missing...` hoặc dữ liệu thiếu chuẩn hóa.【F:system/user/agent.py†L99-L110】【F:system/admin/backend/src/controllers/DeviceController.js†L39-L41】【F:system/admin/backend/src/controllers/DeviceController.js†L422-L425】
3. **Mismatch schema log giữa backend và frontend**
   - Mongo schema dùng `deviceId`, `ip`, `action`; nhưng LogHistory đọc `device_id`, `ip_address`, `status`, `action_taken`, làm sai filter và hiển thị rỗng/sai trạng thái.【F:system/admin/backend/src/models/nosql/SecurityLog.js†L3-L9】【F:system/admin/frontend/src/components/LogHistory.jsx†L42-L43】【F:system/admin/frontend/src/components/LogHistory.jsx†L187-L193】
4. **Agent có lỗi scope biến global `was_wiped`**
   - `ping_access` gán `was_wiped = False/True` nhưng không `global was_wiped`, có thể phát sinh `UnboundLocalError` khi truy cập trước khi gán trong function scope Python.【F:system/user/agent.py†L25-L25】【F:system/user/agent.py†L106-L107】【F:system/user/agent.py†L114-L122】

## 5. REFACTORING ACTION PLAN (Top 3 ưu tiên)

1. **Sửa integration bug và chuẩn hóa contract API ngay lập tức**
   - Thống nhất payload Agent/Backend (`device_id`, `originalName|device_name`, `ip|current_ip`) bằng DTO/schema validation (zod/joi) ở controller boundary.
   - Sửa `DeviceController` để dùng `this.prisma` hoặc inject config chuẩn; thêm test cho các route lock/unlock/check-access.

2. **Tách `DeviceController.checkAccess` thành service/use-case nhỏ hơn**
   - Tách các hàm: `evaluateJITExpiration`, `validateNetworkAccess`, `applyWarningPolicy`, `publishSecurityEvents`.
   - Giảm cyclomatic complexity và tăng khả năng unit test độc lập cho policy engine.

3. **Harden bảo mật môi trường production**
   - Thêm authN/authZ (JWT + RBAC) cho toàn bộ admin endpoints.
   - Giới hạn CORS origin theo allowlist + bật auth handshake cho Socket.IO.
   - Chuyển secret DB sang `.env`/secret manager, xóa credential plaintext khỏi `docker-compose.yml`.
