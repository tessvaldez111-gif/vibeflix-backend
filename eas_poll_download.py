import subprocess, json, time, os, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

env = os.environ.copy()
env["CI"] = "1"
env["EXPO_NO_INTERACTIVE"] = "1"
proxy = "http://127.0.0.1:7890"
env["HTTP_PROXY"] = proxy
env["HTTPS_PROXY"] = proxy

BUILD_ID = "31c6fbf7-7ade-400c-9ecf-0ed2025459fc"
LOG_URL = f"https://expo.dev/accounts/lbx1123/projects/dramaflix/builds/{BUILD_ID}"
APK_DIR = r"C:\Users\1\WorkBuddy\20260324180400"

print(f"Build URL: {LOG_URL}")
print("Polling build status every 60s (max 30 min)...")

for attempt in range(30):
    elapsed = attempt * 60
    print(f"\n--- Check #{attempt+1} ({elapsed}s) ---")
    
    proc = subprocess.Popen(
        ["npx", "eas-cli", "build:list", "--platform", "android", "--limit", "5", "--non-interactive", "--json"],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace",
        cwd=r"C:\Users\1\WorkBuddy\20260324180400\app",
        shell=True, env=env
    )
    stdout, stderr = proc.communicate(timeout=120)
    
    if proc.returncode != 0:
        print(f"Error: {stderr[:200]}")
        time.sleep(60)
        continue
    
    try:
        builds = json.loads(stdout)
    except:
        print(f"JSON parse error, retrying...")
        time.sleep(60)
        continue
    
    found = False
    for b in builds:
        bid = b.get("id", "")
        status = b.get("status", "").lower().replace("-", "_")
        if bid == BUILD_ID:
            found = True
            print(f"Build {BUILD_ID[:8]}... status: {status}")
            if status == "finished":
                artifacts = b.get("artifacts", {})
                build_url = b.get("buildUrl", "")
                print(f"Build page: {build_url}")
                
                if artifacts:
                    print(f"Artifacts: {json.dumps(artifacts, indent=2)}")
                
                # Try downloading
                print("\nDownloading APK...")
                dl_proc = subprocess.Popen(
                    ["npx", "eas-cli", "build:download", "--platform", "android", "--build-id", BUILD_ID, 
                     "--destination", APK_DIR, "--non-interactive"],
                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace",
                    cwd=r"C:\Users\1\WorkBuddy\20260324180400\app",
                    shell=True, env=env
                )
                dl_out, _ = dl_proc.communicate(timeout=300)
                print(dl_out)
                
                if dl_proc.returncode == 0:
                    print("\nAPK downloaded successfully!")
                else:
                    print(f"\nDownload failed, try manually: {LOG_URL}")
                
                sys.exit(0)
            elif status in ("in_progress", "pending", "queued"):
                print("Still building, waiting...")
            else:
                print(f"Build ended with unexpected status: {status}")
                print(f"Check: {LOG_URL}")
                sys.exit(1)
            break
    
    if not found:
        print(f"Build {BUILD_ID[:8]} not found in list, retrying...")
    
    time.sleep(60)

print("\nTimeout waiting for build. Check manually:")
print(LOG_URL)
