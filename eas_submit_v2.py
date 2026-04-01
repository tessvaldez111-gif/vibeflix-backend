import subprocess, json, time, os, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

env = os.environ.copy()
env["CI"] = "1"
env["EXPO_NO_INTERACTIVE"] = "1"

# Ensure proxy is used if available
for k in ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"]:
    v = os.environ.get(k)
    if v:
        env[k] = v

print("Submitting EAS build (10min timeout)...")
proc = subprocess.Popen(
    ["npx", "eas-cli", "build", "--platform", "android", "--profile", "preview", "--non-interactive", "--no-wait"],
    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace",
    cwd=r"C:\Users\1\WorkBuddy\20260324180400\app",
    shell=True, env=env
)

output = []
start = time.time()
while True:
    line = proc.stdout.readline()
    if not line and proc.poll() is not None:
        break
    if not line:
        time.sleep(0.5)
        continue
    line = line.strip()
    if line:
        elapsed = int(time.time() - start)
        print(f"[{elapsed}s] {line}", flush=True)
        output.append(line)
    if time.time() - start > 600:  # 10 min timeout
        print("TIMEOUT - killing process")
        proc.kill()
        break

proc.wait()
print(f"\nExit code: {proc.returncode}")

# Save result
with open(r"C:\Users\1\WorkBuddy\20260324180400\eas_build_result.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(output))
    f.write(f"\nExit code: {proc.returncode}")

# Check for build URL
for line in output:
    if "expo.dev" in line and "/artifacts/" in line:
        print(f"\nBUILD URL FOUND: {line}")
