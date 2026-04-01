import subprocess, os, sys

env = dict(os.environ)
for k in ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']:
    env.pop(k, None)

result = subprocess.run(
    'eas build --profile preview --platform ios --non-interactive',
    capture_output=True, timeout=120, env=env, shell=True
)

out = result.stdout.decode('utf-8', errors='replace')
err = result.stderr.decode('utf-8', errors='replace')

# Write to file to avoid encoding issues
with open('eas_ios_result.txt', 'w', encoding='utf-8') as f:
    f.write(f"RC: {result.returncode}\n")
    f.write(f"STDOUT:\n{out}\n")
    f.write(f"STDERR:\n{err}\n")

print(f"RC: {result.returncode}")
# Print only ASCII-safe parts
print(out[-500:].encode('ascii', errors='replace').decode())
