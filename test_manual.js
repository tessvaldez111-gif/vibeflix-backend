const express = require('/var/www/drama/server/node_modules/express');
const http = require('http');

const app = express();
app.use(express.json());

// Create a manual router with same routes
const myRouter = express.Router();
myRouter.get('/api/comments', (req, res) => {
  res.json({ success: true, test: true });
});
app.use('/api', myRouter);

console.log('Manual router stack:', myRouter.stack.length);

const server = app.listen(8887, () => {
  http.get('http://localhost:8887/api/comments?dramaId=1', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('Manual result:', res.statusCode, d);
      server.close();
      process.exit(0);
    });
  });
});
