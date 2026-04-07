#!/usr/bin/env python3
import ctypes
import sys
import os
import json
import socket
import requests
import socketio
import threading
import time
import winreg
import logging

# Setup logging to file
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'agent.log')),
        logging.StreamHandler()  # For initial logs before hide
    ]
)

# Auto-Recovery state tracker
was_wiped = False

SERVER_BASE = 'http://localhost:3000/api/v1/devices'

def hide_console():
    """Hide the console window."""
    try:
        ctypes.windll.user32.ShowWindow(ctypes.windll.kernel32.GetConsoleWindow(), 0)
        logging.info("Console hidden.")
    except Exception as e:
        logging.error(f"Failed to hide console: {e}")

def is_admin():
    """Check if running as admin."""
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False

def restart_as_admin():
    """Relaunch as admin via UAC."""
    try:
        script_path = os.path.abspath(__file__)
        cmd = f'"{sys.executable}" "{script_path}"'
        ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, cmd, None, 1)
        logging.info("Relaunching as admin...")
        sys.exit(0)
    except Exception as e:
        logging.error(f"Failed to relaunch as admin: {e}")
        sys.exit(1)

def add_to_startup():
    """Add to Windows startup registry (HKLM)."""
    try:
        script_path = os.path.abspath(__file__)
        python_path = sys.executable
        startup_cmd = f'"{python_path}" "{script_path}"'
        
        key = winreg.CreateKey(winreg.HKEY_LOCAL_MACHINE,
                               r"Software\Microsoft\Windows\CurrentVersion\Run")
        winreg.SetValueEx(key, "ZeroTrustAgent", 0, winreg.REG_SZ, startup_cmd)
        winreg.CloseKey(key)
        logging.info("Added to startup registry.")
    except PermissionError:
        logging.error("Permission denied for registry (already admin?).")
    except Exception as e:
        logging.error(f"Failed to add to startup: {e}")

def get_local_ip():
    """Get local IP address."""
    try:
        return socket.gethostbyname(socket.gethostname())
    except Exception:
        logging.warning("Could not get local IP, using 'unknown'")
        return 'unknown'

def load_config():
    """Load config.json from same directory."""
    config_path = os.path.join(os.path.dirname(__file__), 'config.json')
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
        logging.info(f"Config loaded: {config['device_id']} - {config['device_name']}")
        return config
    except FileNotFoundError:
        logging.error("config.json not found. Please create it.")
        sys.exit(1)
    except (json.JSONDecodeError, KeyError) as e:
        logging.error(f"Invalid config.json: {e}")
        sys.exit(1)

def register_device(config, current_ip):
    """Register device with server."""
    try:
        data = {**config, 'current_ip': current_ip}
        response = requests.post(f"{SERVER_BASE}/register", json=data, timeout=5)
        response.raise_for_status()
        logging.info(f"Device registered: {response.status_code}")
    except requests.exceptions.RequestException as e:
        logging.warning(f"Registration failed (server offline?): {e}")

def ping_access(config, current_ip):
    """Ping access check with Auto-Recovery logic."""
    try:
        data = {**config, 'current_ip': current_ip}
        response = requests.post(f"{SERVER_BASE}/check-access", json=data, timeout=5)
        
        if response.status_code == 200:
            logging.info("✅ SAFE - Access OK")
            if was_wiped:
                logging.info("🔄 Auto-Recovery triggered!")
                was_wiped = False
                toggle_desktop_icons(True)  # Khôi phục desktop sau JIT approved
        elif response.status_code == 403:
            if not was_wiped:
                logging.warning("🔒 LOCKED - Executing Fake Wipe")
                was_wiped = True
                toggle_desktop_icons(False)  # Ẩn desktop icons
            else:
                logging.warning("🔒 Still LOCKED - Wipe already active")
        else:
            logging.warning(f"Check failed: {response.status_code}")
    except requests.exceptions.RequestException as e:
        logging.warning(f"Ping failed: {e}")

def toggle_desktop_icons(show):
    """
    Toggle hiển thị Desktop Icons (Auto-Recovery feature).
    
    Khi show=True: Khôi phục icons (Recovery sau JIT approved).
    Khi show=False: Ẩn icons (Fake Wipe khi LOCKED).
    
    Sử dụng Windows Registry HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer
    Key 'NoDesktop' = 1 (DWORD) để ẩn icons.
    """
    try:
        key_path = r"Software\Microsoft\Windows\CurrentVersion\Policies\Explorer"
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_ALL_ACCESS)
        
        if show:
            # KHÔI PHỤC ICONS - Xóa key NoDesktop
            try:
                winreg.DeleteValue(key, "NoDesktop")
                logging.info("✅ Desktop icons restored (Auto-Recovery)")
            except FileNotFoundError:
                logging.info("Desktop already visible")
        else:
            # ẨN ICONS - Fake Wipe
            winreg.SetValueEx(key, "NoDesktop", 0, winreg.REG_DWORD, 1)
            logging.critical("🔒 Fake Wipe executed - Desktop icons hidden!")
        
        winreg.CloseKey(key)
        # Notify Windows shell to refresh desktop
        ctypes.windll.shell32.SHChangeNotify(0x8000000, 0x1000, 0, 0)  # SHCNE_ASSOCCHANGED, SHCNF_IDLIST
    except Exception as e:
        logging.error(f"Từ chối toggle desktop icons: {e}")

def ping_loop(config, current_ip):
    """Background ping loop every 10s."""
    while True:
        ping_access(config, current_ip)
        time.sleep(10)

def main():
    hide_console()
    
    if not is_admin():
        restart_as_admin()
    
    add_to_startup()
    
    config = load_config()
    current_ip = get_local_ip()
    
    register_device(config, current_ip)
    
    # Start ping thread
    ping_thread = threading.Thread(target=ping_loop, args=(config, current_ip), daemon=True)
    ping_thread.start()
    
    # SocketIO for security events
    sio = socketio.Client(reconnection=True, reconnection_attempts=5, reconnection_delay=1)
    
    @sio.event
    def connect():
        logging.info("SocketIO connected")
    
    @sio.event
    def disconnect():
        logging.warning("SocketIO disconnected")
    
    @sio.on('security_log')
    def on_security_log(data):
        logging.info(f"Security log received: {data}")
        if (data.get('device_id') == config['device_id'] and 
            data.get('type') == 'CRITICAL'):
            logging.critical("CRITICAL event - Locking workstation!")
            ctypes.windll.user32.LockWorkStation()
    
    # Connect loop
    while True:
        try:
            sio.connect('http://localhost:3000')
            sio.wait()
        except Exception as e:
            logging.error(f"SocketIO connection failed: {e}. Retrying in 5s...")
            time.sleep(5)

if __name__ == "__main__":
    main()

