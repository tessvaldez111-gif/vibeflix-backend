const express = require('/var/www/drama/server/node_modules/express');
const http = require('http');

const app = express();
app.use(express.json());

// ONLY mount comment routes - nothing else
const comment = require('/var/www/drama/server/dist/routes/comment');
console.log('Comment router stack:', comment.default.stack.length);
app.use('/api', comment.default);

const server = app.listen(8888, () => {
  http.get('http://localhost:8888/api/comments?dramaId=1', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Body:', d.slice(0, 200));
      server.close();
      process.exit(0);
    });
  });
});

setTimeout(() => { process.exit(1); }, 15000);
