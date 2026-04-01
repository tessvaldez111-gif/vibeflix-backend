const express = require('/var/www/drama/server/node_modules/express');
console.log('Express version:', require('/var/www/drama/server/node_modules/express/package.json').version);

const app = express();

// Simple direct route on app
app.get('/api/hello', (req, res) => res.json({ msg: 'hello' }));

const http = require('http');
const server = app.listen(8993, () => {
  http.get('http://localhost:8993/api/hello', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('Direct route:', res.statusCode, d);
      server.close();
      process.exit(0);
    });
  });
});
