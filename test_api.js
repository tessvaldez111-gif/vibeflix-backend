const http = require('http');
// Test comments API
const testGet = (path, token) => {
  return new Promise((resolve) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const r = http.request({ hostname: '43.159.62.11', port: 3001, path, method: 'GET', headers }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    r.end();
  });
};

const testPost = (path, data, token) => {
  return new Promise((resolve) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const body = JSON.stringify(data);
    const r = http.request({ hostname: '43.159.62.11', port: 3001, path, method: 'POST', headers }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    r.write(body);
    r.end();
  });
};

// Use test user token from registration
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwidXNlcm5hbWUiOiJ0ZXN0dXNlcjAyIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NDMwNTA4MTAsImV4cCI6MTc0MzEzNzIxMH0.Mj3YZ2KFNr_Ip8-yCpF-ljCXvMR2nzTHy-NHsYNhyi4';

async function main() {
  // 1. Test get comments
  console.log('--- GET /api/comments?dramaId=1 ---');
  const r1 = await testGet('/api/comments?dramaId=1&page=1&pageSize=5', null);
  console.log(r1.status, r1.body.slice(0, 200));

  // 2. Test get danmaku
  console.log('\n--- GET /api/danmaku?dramaId=1&episodeId=1 ---');
  const r2 = await testGet('/api/danmaku?dramaId=1&episodeId=1', null);
  console.log(r2.status, r2.body.slice(0, 200));

  // 3. Test ad reward today
  console.log('\n--- GET /api/ad-reward/today ---');
  const r3 = await testGet('/api/ad-reward/today', TOKEN);
  console.log(r3.status, r3.body.slice(0, 200));

  // 4. Test add comment
  console.log('\n--- POST /api/comments ---');
  const r4 = await testPost('/api/comments', { dramaId: 1, content: 'Great drama! Love episode 1.' }, TOKEN);
  console.log(r4.status, r4.body.slice(0, 200));
}

main().catch(console.error);
