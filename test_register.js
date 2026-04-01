const http = require('http');

function post(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = http.request({
      hostname: '43.159.62.11',
      port: 3001,
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function test() {
  // Step 1: Send code
  console.log('=== Step 1: Send verification code ===');
  const r1 = await post('/api/users/send-code', { email: 'newtestuser2026@gmail.com' });
  console.log('Status:', r1.status, 'Body:', r1.body);
  const d1 = JSON.parse(r1.body);
  if (!d1.success || !d1.data?.devCode) {
    console.log('Failed to get code, aborting');
    return;
  }
  const code = d1.data.devCode;
  console.log('Got verification code:', code);

  // Step 2: Register
  console.log('\n=== Step 2: Register ===');
  const r2 = await post('/api/users/register', {
    username: 'testuser03',
    password: 'test123456',
    nickname: '测试03',
    email: 'newtestuser2026@gmail.com',
    emailCode: code,
  });
  console.log('Status:', r2.status, 'Body:', r2.body);

  if (JSON.parse(r2.body).success) {
    // Step 3: Login
    console.log('\n=== Step 3: Login ===');
    const r3 = await post('/api/users/login', {
      username: 'testuser03',
      password: 'test123456',
    });
    console.log('Status:', r3.status, 'Body:', r3.body);
  }
}

test().catch(console.error);
