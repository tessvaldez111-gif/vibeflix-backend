const express = require('/var/www/drama/server/node_modules/express');
const http = require('http');

const app = express();
app.use(express.json());

// Mount comment with NO prefix (since routes already include /api)
const comment = require('/var/www/drama/server/dist/routes/comment');
app.use(comment.default);

const server = app.listen(8883, () => {
  http.get('http://localhost:8883/api/comments?dramaId=1', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('Comments:', res.statusCode, d.slice(0, 200));
      server.close();
      process.exit(0);
    });
  });
});

setTimeout(() => { process.exit(1); }, 15000);
