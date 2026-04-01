const express = require('/var/www/drama/server/node_modules/express');
const http = require('http');

const app = express();
app.use(express.json());

// Route 1: directly on app
app.get('/api/direct', (req, res) => res.json({ ok: true, method: 'direct' }));

// Route 2: via router mounted on app
const r1 = express.Router();
r1.get('/api/via-router', (req, res) => res.json({ ok: true, method: 'router' }));
app.use(r1);

// Route 3: via router mounted with prefix
const r2 = express.Router();
r2.get('/test', (req, res) => res.json({ ok: true, method: 'prefixed-router' }));
app.use('/api', r2);

const server = app.listen(8992, () => {
  const tests = [
    '/api/direct',
    '/api/via-router',
    '/api/test'
  ];
  let idx = 0;
  function runNext() {
    if (idx >= tests.length) {
      server.close();
      process.exit(0);
      return;
    }
    const url = 'http://localhost:8992' + tests[idx];
    http.get(url, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        console.log(tests[idx], '->', res.statusCode, d);
        idx++;
        runNext();
      });
    });
  }
  runNext();
});
