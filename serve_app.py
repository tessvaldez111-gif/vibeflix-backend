import http.server, os, threading

os.chdir(r'C:\Users\1\WorkBuddy\20260324180400\app\dist')

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

httpd = http.server.HTTPServer(('0.0.0.0', 8082), Handler)
print('Serving app/dist on http://localhost:8082')
httpd.serve_forever()
