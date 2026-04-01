const express = require('/var/www/drama/server/node_modules/express');
const http = require('http');

const app = express();

app.get('/hello', (req, res) => {
  res.json({ ok: true });
});

const server = app.listen(8886, () => {
  http.get('http://localhost:8886/hello', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('Status:', res.statusCode, 'Body:', d);
      server.close();
      process.exit(0);
    });
  });
});
