const Router = require('/var/www/drama/server/node_modules/express').Router;
const http = require('http');

// Create a fresh router with one route to test basic functionality
const testRouter = Router();
testRouter.get('/api/test-comments', (req, res) => {
  res.json({ success: true, message: 'test route works' });
});

const express = require('/var/www/drama/server/node_modules/express');
const app = express();
app.use('/api', testRouter);

const server = app.listen(8997, () => {
  http.get('http://localhost:8997/api/test-comments', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log('Basic test - Status:', res.statusCode, 'Body:', data);
      server.close();
      
      // Now test with comment router
      const comment = require('/var/www/drama/server/dist/routes/comment');
      const app2 = express();
      app2.use('/api', comment.default);
      const server2 = app2.listen(8996, () => {
        http.get('http://localhost:8996/api/comments?dramaId=1', (res2) => {
          let data2 = '';
          res2.on('data', c => data2 += c);
          res2.on('end', () => {
            console.log('Comment test - Status:', res2.statusCode, 'Body:', data2.slice(0,200));
            server2.close();
            process.exit(0);
          });
        });
      });
    });
  });
});

setTimeout(() => { process.exit(1); }, 15000);
