const express = require('express');
const bodyParser = require('body-parser');

try {
  const comment = require('/var/www/drama/server/dist/routes/comment');
  console.log('comment loaded, type:', typeof comment.default);
  
  const app = express();
  app.use(bodyParser.json());
  app.use('/api', comment.default);
  
  const server = app.listen(8999, () => {
    console.log('Test server on 8999');
    const http = require('http');
    http.get('http://localhost:8999/api/comments?dramaId=1', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Body:', data);
        server.close();
        process.exit(0);
      });
    });
  });
} catch(e) {
  console.log('LOAD ERROR:', e.message, e.stack);
  process.exit(1);
}
