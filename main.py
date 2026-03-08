"""
Melete — Entry point
Starts FastAPI server (REST + static files) and opens a pywebview window.
Mobile users connect via browser to http://[host-ip]:7749
"""
import sys
import os
import subprocess
import threading
import time

PORT = 7749
HOST = "0.0.0.0"


def free_port(port: int):
    """Kill any process currently listening on the given port (Windows)."""
    try:
        result = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True, text=True
        )
        for line in result.stdout.splitlines():
            if f":{port}" in line and "LISTENING" in line:
                parts = line.split()
                pid = parts[-1]
                subprocess.run(["taskkill", "/PID", pid, "/F"],
                               capture_output=True)
                print(f"[Melete] Freed port {port} (killed PID {pid})")
                time.sleep(0.5)
                break
    except Exception:
        pass


def auto_install():
    """Install dependencies automatically if missing."""
    try:
        import fastapi  # noqa
        import uvicorn  # noqa
        import webview  # noqa
        import fitz  # noqa
    except ImportError:
        print("[Melete] Installing dependencies... (first run only)")
        req = os.path.join(os.path.dirname(__file__), "requirements.txt")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", req, "-q"])
        print("[Melete] Dependencies installed.")


def start_server():
    """Start FastAPI/uvicorn in a daemon thread."""
    import asyncio
    import uvicorn
    from api_server import app

    # Windows ProactorEventLoop raises ConnectionResetError (WinError 10054) when
    # the browser drops a connection mid-flight. This is harmless noise — suppress it.
    def _ignore_connection_reset(loop, context):
        exc = context.get("exception")
        if isinstance(exc, ConnectionResetError):
            return
        loop.default_exception_handler(context)

    async def _serve():
        loop = asyncio.get_running_loop()
        loop.set_exception_handler(_ignore_connection_reset)
        config = uvicorn.Config(app, host=HOST, port=PORT, log_level="warning")
        await uvicorn.Server(config).serve()

    asyncio.run(_serve())


def wait_for_server(timeout=15):
    """Poll until the HTTP server responds."""
    import urllib.request
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{PORT}/api/ping", timeout=1)
            return True
        except Exception:
            time.sleep(0.2)
    return False


def main():
    auto_install()
    free_port(PORT)

    # Start FastAPI server in background thread
    t = threading.Thread(target=start_server, daemon=True)
    t.start()

    print(f"[Melete] Server starting on http://0.0.0.0:{PORT}")

    if not wait_for_server():
        print("[Melete] ERROR: Server did not start in time.")
        sys.exit(1)

    # Try to open pywebview (desktop mode)
    try:
        import webview  # type: ignore
        # Expose pick_folder for native file dialogs on desktop
        class DesktopAPI:
            def pick_folder(self):
                result = webview.windows[0].create_file_dialog(
                    webview.FOLDER_DIALOG
                )
                return result[0] if result else None

        window = webview.create_window(
            "Melete",
            f"http://127.0.0.1:{PORT}",
            width=1440,
            height=900,
            min_size=(800, 600),
            js_api=DesktopAPI(),
        )
        webview.start(debug=False)
    except Exception as e:
        # No display / headless — just keep server running for mobile access
        import socket
        local_ip = socket.gethostbyname(socket.gethostname())
        print(f"[Melete] Running in server mode (no display).")
        print(f"[Melete] Access from your mobile: http://{local_ip}:{PORT}")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("[Melete] Shutting down.")


if __name__ == "__main__":
    main()
