const express = require('/var/www/drama/server/node_modules/express');
const http = require('http');

const app = express();
app.use(express.json());

// Create a fresh router identical to how comment.js does it
const comment = require('/var/www/drama/server/dist/routes/comment');
const commentRouter = comment.default;

// Check if it's actually a Router
const RouterProto = express.Router;
const isRouter = commentRouter instanceof RouterProto || 
                 commentRouter.constructor.name === 'Router' ||
                 (typeof commentRouter.handle === 'function' && typeof commentRouter.use === 'function');
console.log('Is router:', isRouter);
console.log('Has handle:', typeof commentRouter.handle);
console.log('Has use:', typeof commentRouter.use);
console.log('Has get:', typeof commentRouter.get);
console.log('Has stack:', Array.isArray(commentRouter.stack));
console.log('Stack length:', commentRouter.stack?.length);

// Try to handle a request directly
const mockReq = { method: 'GET', url: '/api/comments?dramaId=1', query: { dramaId: '1' } };
const mockRes = {
  statusCode: 0,
  body: '',
  json: function(d) { this.body = JSON.stringify(d); },
  status: function(c) { this.statusCode = c; return this; },
  end: function() {},
};

try {
  commentRouter.handle(mockReq, mockRes, () => {
    console.log('No route matched (next called)');
  });
  console.log('After handle - status:', mockRes.statusCode, 'body:', mockRes.body?.slice(0,100));
} catch(e) {
  console.log('Handle error:', e.message);
}

// Also try a fresh Router to compare
const freshRouter = express.Router();
freshRouter.get('/api/test', (req, res) => res.json({ ok: true }));
const mockRes2 = {
  statusCode: 0,
  body: '',
  json: function(d) { this.body = JSON.stringify(d); },
  status: function(c) { this.statusCode = c; return this; },
  end: function() {},
};
try {
  freshRouter.handle(mockReq, mockRes2, () => {
    console.log('Fresh router: no match');
  });
  console.log('Fresh router - status:', mockRes2.statusCode);
} catch(e) {
  console.log('Fresh error:', e.message);
}

// One more test: create a new Router and try mounting
const newApp = express();
newApp.use(express.json());

const newRouter = express.Router();
newRouter.get('/api/check', (req, res) => res.json({ ok: true }));
newApp.use(newRouter);

// Now mount commentRouter
newApp.use(commentRouter);

const server = newApp.listen(8991, () => {
  http.get('http://localhost:8991/api/check', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('Check route:', res.statusCode, d);
      http.get('http://localhost:8991/api/comments?dramaId=1', (res2) => {
        let d2 = '';
        res2.on('data', c => d2 += c);
        res2.on('end', () => {
          console.log('Comments via mount:', res2.statusCode, d2.slice(0,100));
          server.close();
          process.exit(0);
        });
      });
    });
  });
});

setTimeout(() => { process.exit(1); }, 15000);
