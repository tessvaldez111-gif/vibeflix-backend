const express = require('/var/www/drama/server/node_modules/express');
const http = require('http');

const app = express();

// Basic route
app.get('/api/test-basic', (req, res) => {
  res.json({ success: true });
});

// Mount comment router
try {
  const comment = require('/var/www/drama/server/dist/routes/comment');
  console.log('Comment loaded, default type:', typeof comment.default);
  app.use('/api', comment.default);
  console.log('Comment router mounted');
} catch(e) {
  console.log('Comment load error:', e.message);
}

// Also mount directly on sub-path to test
app.get('/api/direct-test', (req, res) => {
  res.json({ success: true, route: 'direct' });
});

const server = app.listen(8995, () => {
  console.log('Server on 8995');
  
  // Test basic route
  http.get('http://localhost:8995/api/test-basic', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('Basic:', res.statusCode, d);
      
      // Test direct route
      http.get('http://localhost:8995/api/direct-test', (res2) => {
        let d2 = '';
        res2.on('data', c => d2 += c);
        res2.on('end', () => {
          console.log('Direct:', res2.statusCode, d2);
          
          // Test comment route
          http.get('http://localhost:8995/api/comments?dramaId=1', (res3) => {
            let d3 = '';
            res3.on('data', c => d3 += c);
            res3.on('end', () => {
              console.log('Comment:', res3.statusCode, d3.slice(0,100));
              server.close();
              process.exit(0);
            });
          });
        });
      });
    });
  });
});

setTimeout(() => { process.exit(1); }, 15000);
