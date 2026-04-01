const express = require('/var/www/drama/server/node_modules/express');
const http = require('http');

const app = express();

// Test: router with '/api' prefix, route with '/api/hello' path
// This means the route path already includes '/api', so mount with empty prefix
const r = express.Router();
r.get('/api/hello', (req, res) => res.json({ ok: true }));
app.use(r);  // No prefix!

console.log('Test 1: router path includes /api, mounted without prefix');
const server = app.listen(8884, () => {
  http.get('http://localhost:8884/api/hello', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('Status:', res.statusCode, 'Body:', d);
      server.close();
      process.exit(0);
    });
  });
});
