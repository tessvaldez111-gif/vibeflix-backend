#!/usr/bin/env python3
"""Test COS STS endpoint"""
import urllib.request
import json

# Step 1: Login
login_data = json.dumps({"username": "admin", "password": "admin123"}).encode()
req = urllib.request.Request("http://43.159.62.11/api/login", data=login_data, headers={"Content-Type": "application/json"})
resp = urllib.request.urlopen(req)
login_result = json.loads(resp.read().decode())
token = login_result["data"]["token"]
print("Login OK, got token")

# Step 2: Get STS credentials
req2 = urllib.request.Request("http://43.159.62.11/api/cos/sts", headers={"Authorization": f"Bearer {token}"})
resp2 = urllib.request.urlopen(req2)
sts_result = json.loads(resp2.read().decode())
print("STS result:")
print(json.dumps(sts_result, indent=2))
