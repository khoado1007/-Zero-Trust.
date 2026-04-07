import time
import requests

SERVER_URL = "http://localhost:3000/api/v1/devices/check-access"
agent_data = {
    "device_id": "MAC-001-BOSS",
    "device_name": "Dell XPS 15",
    "current_ip": "192.168.1.100"  # IP trung khop voi COMPANY_IP tren server
}

print("=== [AGENT ONLINE] MAY CUA SEP (MAC-001) ===")
while True:
    try:
        response = requests.post(SERVER_URL, json=agent_data, timeout=3)
        if response.status_code == 200:
            print("[SAFE] Truy cap hop le tu mang noi bo.")
        elif response.status_code == 403:
            print("[CRITICAL] BI KHOA MAY!!!")
    except Exception:
        print("[WARNING] Khong tim thay Server (Kiem tra lai Node.js).")
    time.sleep(4)