// Directly require the compiled index and test
process.chdir('/var/www/drama/server');

// Monkey-patch app.listen to prevent actual server start
const origListen = require('express').application.listen;
require('express').application.listen = function() {
  console.log('Server.listen intercepted');
  return this;
};

// Add debug logging to router
const Router = require('express').Router;
const origGet = Router.prototype.get;
Router.prototype.get = function(path, ...fns) {
  if (path.includes('comment') || path.includes('danmaku') || path.includes('ad-reward')) {
    console.log('REGISTERED GET:', path);
  }
  return origGet.call(this, path, ...fns);
};

const origPost = Router.prototype.post;
Router.prototype.post = function(path, ...fns) {
  if (path.includes('comment') || path.includes('danmaku') || path.includes('ad-reward')) {
    console.log('REGISTERED POST:', path);
  }
  return origPost.call(this, path, ...fns);
};

// Now load the routes
const comment = require('/var/www/drama/server/dist/routes/comment');
console.log('Comment module loaded');
console.log('comment.default:', typeof comment.default);

const router = comment.default;
console.log('Router type:', typeof router);
console.log('Router stack length:', router.stack.length);

router.stack.forEach((r, i) => {
  if (r.route) {
    const methods = Object.keys(r.route.methods).join(',');
    console.log('Route', i, methods, r.route.path);
  }
});

// Try mounting on a mini app and testing
const express = require('express');
const app = express();
app.use('/api', router);

// Count registered routes on app._router
let commentRoutes = 0;
app._router.stack.forEach((layer, i) => {
  if (layer.name === 'router' && layer.handle === router) {
    console.log('\nComment router found at stack index', i);
    console.log('Router handle has stack length:', layer.handle.stack.length);
  }
});

// Simulate a request
const http = require('http');
const server = app.listen(8998, () => {
  console.log('\nTest server started');
  http.get('http://localhost:8998/api/comments?dramaId=1', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Body:', data.slice(0, 200));
      server.close();
      process.exit(0);
    });
  });
});

setTimeout(() => { server.close(); process.exit(1); }, 15000);
