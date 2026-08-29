import http.server
import socketserver
import os
import sys

PORT = 8082
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIRECTORY = os.path.join(BASE_DIR, "ota_server")

if not os.path.exists(DIRECTORY):
    os.makedirs(DIRECTORY, exist_ok=True)

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/sync' or self.path == '/sync/':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                sync_file = os.path.join(DIRECTORY, 'sync.json')
                with open(sync_file, 'wb') as f:
                    f.write(post_data)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status": "success"}')
                print(f"[SYNC] Datos sincronizados correctamente ({len(post_data)} bytes)")
            except Exception as e:
                print(f"[SYNC ERROR] {e}")
                self.send_response(500)
                self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()

class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with ThreadingHTTPServer(("", PORT), CustomHandler) as httpd:
        print(f"Servidor FORTIXAM OTA & Sync activo en puerto {PORT}")
        print(f"Directorio servido: {DIRECTORY}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")
            sys.exit(0)
