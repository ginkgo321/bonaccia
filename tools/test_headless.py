import subprocess
import time
import urllib.request
import os
import sys
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler

class CustomHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

def run_server(directory, port):
    os.chdir(directory)
    httpd = HTTPServer(("127.0.0.1", port), CustomHandler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd

def test_site(directory, port, pages):
    print(f"\n--- Testing {directory} on port {port} ---")
    httpd = run_server(directory, port)
    time.sleep(0.5)

    chrome = next((c for c in (r"C:\Program Files\Google\Chrome\Application\chrome.exe", r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe") if os.path.exists(c)), "chrome")
    all_ok = True
    try:
        for p in pages:
            url = f"http://127.0.0.1:{port}/{p}"
            cmd = [
                chrome,
                "--headless=new",
                "--disable-gpu",
                "--dump-dom",
                "--virtual-time-budget=2000",
                url
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=30)
            dom = res.stdout or ""
            print(f"Page {p}: DOM length = {len(dom)} chars")
            if "ora" in p.lower() or p == "index.html#/":
                if len(dom) > 1000:
                    print("  OK Home view rendered successfully!")
                else:
                    print("  ERRORE Warning: Home view empty")
                    all_ok = False
    finally:
        httpd.shutdown()

    return all_ok

if __name__ == "__main__":
    radice = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ok = test_site(radice, 8089, ["index.html#ora", "index.html#suoni"])
    if ok:
        print("TUTTI I TEST PASSATI")
    else:
        print("ALCUNI TEST FALLITI")
        sys.exit(1)
