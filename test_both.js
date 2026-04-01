const express = require('/var/www/drama/server/node_modules/express');
const http = require('http');

const app = express();
app.use(express.json());

// Mount both drama and comment routes
const drama = require('/var/www/drama/server/dist/routes/drama');
const comment = require('/var/www/drama/server/dist/routes/comment');

app.use('/api', drama.default);
app.use('/api', comment.default);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const server = app.listen(8990, () => {
  const tests = [
    { url: '/api/health', expect: 200 },
    { url: '/api/dramas', expect: 200 },
    { url: '/api/comments?dramaId=1', expect: 200 },
  ];
  let idx = 0;
  function runNext() {
    if (idx >= tests.length) {
      server.close();
      process.exit(0);
      return;
    }
    const t = tests[idx];
    http.get('http://localhost:8990' + t.url, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        console.log(t.url, '->', res.statusCode, t.expect === res.statusCode ? 'OK' : 'FAIL', d.slice(0,60));
        idx++;
        runNext();
      });
    });
  }
  runNext();
});

setTimeout(() => { process.exit(1); }, 15000);
