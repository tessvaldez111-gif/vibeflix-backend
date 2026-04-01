try {
  const comment = require('/var/www/drama/server/dist/routes/comment');
  console.log('Type:', typeof comment.default);
  const router = comment.default;
  console.log('Routes:', router.stack.length);
  router.stack.forEach((r, i) => {
    if (r.route) {
      const methods = Object.keys(r.route.methods).join(',');
      console.log(i, methods, r.route.path);
    }
  });
} catch(e) {
  console.log('ERROR:', e.message);
}
