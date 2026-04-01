import subprocess, json, time

def check():
    r = subprocess.run(
        ["cmd", "/c", "npx eas-cli build:list --platform android --limit 3 --json"],
        capture_output=True, text=True, cwd=r"C:\Users\1\WorkBuddy\20260324180400\app",
        timeout=30, shell=True
    )
    try:
        data = json.loads(r.stdout.strip())
        for b in data:
            bid = b.get('id', '')
            status = b.get('status', '')
            arts = b.get('artifacts', [])
            print(f"{bid[:12]}  {status}")
            if status == 'FINISHED' and arts:
                url = arts[0].get('url', '')
                print(f"  APK: {url}")
                return bid[:12], url
    except:
        print(r.stdout[:300] if r.stdout else r.stderr[:300])
    return None, None

bid, url = check()
if url:
    print(f"\nBUILD DONE! APK: {url}")
