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

    chrome = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
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
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            dom = res.stdout
            print(f"Page {p}: DOM length = {len(dom)} chars")
            if "recitazioni" in p.lower():
                if "Abdul Basit" in dom or "Minshawi" in dom:
                    print("  ✓ Reciters found in rendered DOM!")
                else:
                    print("  ✗ Warning: Reciters not found in rendered DOM")
                    all_ok = False
            elif "ora" in p.lower() or p == "index.html#/":
                if len(dom) > 1000:
                    print("  ✓ Home view rendered successfully!")
                else:
                    print("  ✗ Warning: Home view empty")
                    all_ok = False
    finally:
        httpd.shutdown()

    return all_ok

if __name__ == "__main__":
    ok1 = test_site(
        r"C:\Users\df\Dev\GitHub\Bonaccia (acufene)",
        8089,
        ["index.html#ora", "index.html#recitazioni"]
    )
    ok2 = test_site(
        r"C:\Users\df\Dev\GitHub\insonnia",
        8769,
        ["index.html#/", "index.html#/recitazioni", "index.html#/notte/recitazioni"]
    )

    if ok1 and ok2:
        print("\nALL HEADLESS TESTS PASSED PERFECTLY!")
    else:
        print("\nSOME TESTS FAILED")
        sys.exit(1)
