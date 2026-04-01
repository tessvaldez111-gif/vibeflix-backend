import subprocess, json, time, os, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

env = os.environ.copy()
env["CI"] = "1"
env["EXPO_NO_INTERACTIVE"] = "1"

print("Submitting EAS build...")
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
    if not line:
        break
    line = line.strip()
    if line:
        print(line)
        output.append(line)
    if time.time() - start > 300:  # 5 min timeout
        print("TIMEOUT - killing process")
        proc.kill()
        break

proc.wait()
print(f"\nExit code: {proc.returncode}")

# Check for build URL in output
full_output = "\n".join(output)
for line in output:
    if "expo.dev" in line and "/artifacts/" in line:
        print(f"\nBUILD URL FOUND: {line}")
