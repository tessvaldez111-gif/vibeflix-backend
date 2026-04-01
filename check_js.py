#!/usr/bin/env python3
import re, subprocess

with open('/var/www/drama/server/public/admin.html', 'r') as f:
    content = f.read()

match = re.search(r'<script>(.*?)</script>', content, re.DOTALL)
if match:
    js = match.group(1)
    with open('/tmp/admin_check.js', 'w') as f:
        f.write(js)
    result = subprocess.run(['node', '--check', '/tmp/admin_check.js'], capture_output=True, text=True)
    if result.returncode == 0:
        print("JS syntax OK")
    else:
        print("JS Error:", result.stderr)
else:
    print("No script tag found")
