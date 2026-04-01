import subprocess, json, sys

result = subprocess.run(
    ["npx", "eas-cli", "build:list", "--platform", "android", "--limit", "2", "--non-interactive", "--json"],
    capture_output=True, text=True, cwd=r"C:\Users\1\WorkBuddy\20260324180400\app",
    shell=True
)
data = result.stdout.strip()
try:
    builds = json.loads(data)
    for b in builds:
        bid = b["id"]
        status = b["status"]
        arts = b.get("artifacts", {})
        burl = arts.get("buildUrl", "N/A")
        iurl = arts.get("installUrl", "N/A")
        print(f"Build: {bid}")
        print(f"Status: {status}")
        print(f"Build URL: {burl}")
        print(f"Install URL: {iurl}")
        print("---")
except Exception as e:
    print(f"Parse error: {e}")
    print(data[:1000])
