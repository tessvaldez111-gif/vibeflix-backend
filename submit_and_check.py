import subprocess, json, time, sys

# Submit build
print("Submitting EAS build...")
result = subprocess.run(
    ['npx', 'eas-cli', 'build', '--platform', 'android', '--profile', 'preview', '--non-interactive', '--json'],
    capture_output=True, text=True, cwd=r'C:\Users\1\WorkBuddy\20260324180400\app',
    shell=True, env={**dict(__import__('os').environ), 'CI': 'true'}
)

stdout = result.stdout.strip()
stderr = result.stderr.strip()

print("STDOUT last 500:", stdout[-500:] if stdout else "EMPTY")
print("STDERR last 200:", stderr[-200:] if stderr else "EMPTY")

# Try to extract build ID from output
import re
build_id_match = re.search(r'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', stdout)
build_id = build_id_match.group(1) if build_id_match else None

if not build_id:
    # Also try from stderr
    build_id_match = re.search(r'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', stderr)
    build_id = build_id_match.group(1) if build_id_match else None

if build_id:
    print(f"\nBuild ID: {build_id}")
    print("Polling for completion...")
    
    for i in range(40):
        time.sleep(30)
        check = subprocess.run(
            ['npx', 'eas-cli', 'build:list', '--platform', 'android', '--limit', '5', '--non-interactive', '--json'],
            capture_output=True, text=True, cwd=r'C:\Users\1\WorkBuddy\20260324180400\app',
            shell=True
        )
        data = check.stdout.strip()
        if data.startswith('['):
            builds = json.loads(data)
            for b in builds:
                if b.get("id") == build_id:
                    status = b.get("status", "?")
                    print(f"[{i+1}] Status: {status}")
                    if status == "FINISHED":
                        arts = b.get("artifacts", {})
                        url = arts.get("buildUrl", "")
                        print(f"\nAPK URL: {url}")
                        # Download to server
                        print("\nDownloading to server...")
                        dl = subprocess.run(
                            ['ssh', '-i', r'C:\Users\1\Desktop\SSSH私钥\K01.pem', '-o', 'StrictHostKeyChecking=no',
                             'root@43.159.62.11',
                             f'curl -L -o /var/www/drama/downloads/DramaFlix.apk "{url}" && echo DOWNLOAD_OK'],
                            capture_output=True, text=True, shell=True
                        )
                        if 'DOWNLOAD_OK' in dl.stdout:
                            print("APK deployed to http://43.159.62.11/downloads/DramaFlix.apk")
                        else:
                            print("Download may have failed:", dl.stdout[-200:], dl.stderr[-200:])
                        sys.exit(0)
                    elif status == "ERROR":
                        print("Build FAILED!")
                        sys.exit(1)
                    break
            else:
                print(f"[{i+1}] Build not in list yet...")
        else:
            print(f"[{i+1}] Parse error, retrying...")
    print("Timeout")
else:
    print("Could not extract build ID from output")
