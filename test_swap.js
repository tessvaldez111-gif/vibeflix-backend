const express = require('/var/www/drama/server/node_modules/express');
const http = require('http');

const app = express();
app.use(express.json());

// Mount COMMENT FIRST, then DRAMA
const comment = require('/var/www/drama/server/dist/routes/comment');
const drama = require('/var/www/drama/server/dist/routes/drama');

app.use('/api', comment.default);
app.use('/api', drama.default);

const server = app.listen(8889, () => {
  http.get('http://localhost:8889/api/comments?dramaId=1', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('Comments:', res.statusCode, d.slice(0, 100));
      server.close();
      process.exit(0);
    });
  });
});

setTimeout(() => { process.exit(1); }, 15000);
