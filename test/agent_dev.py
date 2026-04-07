import time
import requests

SERVER_URL = "http://localhost:3000/api/v1/devices/check-access"
agent_data = {
    "device_id": "MAC-002-DEV",
    "device_name": "ThinkPad T14",
    "current_ip": "14.168.22.5"  # IP La
}

print("=== [AGENT ONLINE] MAY NHAN VIEN DEV (MAC-002) ===")
while True:
    try:
        response = requests.post(SERVER_URL, json=agent_data, timeout=3)
        if response.status_code == 200:
            print("[SAFE] Truy cap hop le.")
        elif response.status_code == 403:
            print("[CRITICAL] BI KHOA MAY DO SAI IP!!!")
    except Exception:
        print("[WARNING] Khong tim thay Server.")
    time.sleep(4)