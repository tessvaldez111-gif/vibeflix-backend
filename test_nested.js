const express = require('/var/www/drama/server/node_modules/express');
const http = require('http');

const app = express();

// Nested path test: app -> router with prefix -> route
const r = express.Router();
r.get('/hello', (req, res) => res.json({ ok: true }));
app.use('/api', r);

const server = app.listen(8885, () => {
  http.get('http://localhost:8885/api/hello', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('Status:', res.statusCode, 'Body:', d);
      server.close();
      process.exit(0);
    });
  });
});
