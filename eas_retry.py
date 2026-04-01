import subprocess, json, time, os, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

env = os.environ.copy()
env["CI"] = "1"
env["EXPO_NO_INTERACTIVE"] = "1"

# Try with a proxy or retry multiple times
max_retries = 3
for attempt in range(max_retries):
    print(f"\n=== Attempt {attempt + 1}/{max_retries} ===")
    proc = subprocess.Popen(
        ["npx", "eas-cli", "build", "--platform", "android", "--profile", "preview", "--non-interactive", "--no-wait"],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
        cwd=r"C:\Users\1\WorkBuddy\20260324180400\app",
        shell=True, env=env, encoding="utf-8", errors="replace"
    )

    output = []
    start = time.time()
    success = False
    while True:
        try:
            line = proc.stdout.readline()
        except:
            break
        if not line:
            break
        line = line.strip()
        if line:
            print(line)
            output.append(line)
        if "Build created" in line or "https://expo.dev/accounts" in line:
            success = True
            break
        if time.time() - start > 300:
            print("TIMEOUT")
            proc.kill()
            break

    proc.wait()
    
    if success or proc.returncode == 0:
        print("\n=== BUILD SUBMITTED SUCCESSFULLY ===")
        break
    
    full_output = "\n".join(output)
    if "ECONNRESET" in full_output or "failed" in full_output.lower():
        print(f"\nUpload failed (network issue). Retrying in 10s...")
        time.sleep(10)
        continue
    else:
        print(f"\nBuild failed with exit code {proc.returncode}")
        break
