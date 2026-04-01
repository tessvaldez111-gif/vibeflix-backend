#!/usr/bin/env python3
import json, urllib.request

# Test /api/login (admin login from auth.ts)
data = json.dumps({"username": "admin", "password": "admin123"}).encode()
req = urllib.request.Request(
    "http://localhost/api/login",
    data=data,
    headers={"Content-Type": "application/json"}
)
try:
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read().decode())
    print("Admin login OK, token:", result["data"]["token"][:30] + "...")
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}:", e.read().decode())
except Exception as e:
    print("Error:", e)
