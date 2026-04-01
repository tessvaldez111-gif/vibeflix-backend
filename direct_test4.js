const express = require('/var/www/drama/server/node_modules/express');
const http = require('http');

const app = express();
app.use(express.json());

// Create router A with a basic route
const routerA = express.Router();
routerA.get('/api/route-a', (req, res) => {
  res.json({ success: true, route: 'A' });
});

// Mount it
app.use('/api', routerA);
console.log('Router A mounted, stack:', routerA.stack.length);

// Now require comment router
const comment = require('/var/www/drama/server/dist/routes/comment');
const commentRouter = comment.default;
console.log('Comment router type:', typeof commentRouter, 'stack:', commentRouter.stack.length);

// Mount comment router
app.use('/api', commentRouter);
console.log('Comment router mounted');

// List all routes on app
let routeCount = 0;
app._router.stack.forEach((layer, i) => {
  if (layer.name === 'router') {
    console.log(`  Router at ${i}: ${layer.handle.stack.length} routes`);
    layer.handle.stack.forEach((r, j) => {
      if (r.route) {
        routeCount++;
        const methods = Object.keys(r.route.methods).join(',');
        console.log(`    ${j}: ${methods} ${r.route.path}`);
      }
    });
  }
});
console.log('Total routes:', routeCount);

const server = app.listen(8994, () => {
  http.get('http://localhost:8994/api/route-a', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('\nRoute A result:', res.statusCode, d);
      
      http.get('http://localhost:8994/api/comments?dramaId=1', (res2) => {
        let d2 = '';
        res2.on('data', c => d2 += c);
        res2.on('end', () => {
          console.log('Comments result:', res2.statusCode, d2.slice(0, 100));
          server.close();
          process.exit(0);
        });
      });
    });
  });
});

setTimeout(() => { process.exit(1); }, 15000);
