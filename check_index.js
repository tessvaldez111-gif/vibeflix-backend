// Simple test: check if the compiled index.js actually registers comment routes
const fs = require('fs');
const path = '/var/www/drama/server/dist/index.js';
const content = fs.readFileSync(path, 'utf-8');

// Check if comment routes are imported and used
const hasCommentImport = content.includes("require(\"./routes/comment\")");
const hasCommentUse = content.includes("comment_1.default");

console.log('Has comment import:', hasCommentImport);
console.log('Has comment use:', hasCommentUse);

// Check the order of app.use calls
const appUseMatches = content.match(/app\.use\(['"][^'"]*['"][^)]*\)/g);
console.log('\nAll app.use calls:');
appUseMatches.forEach((m, i) => console.log(i, m));

// Check what's between cosRoutes and the 404 handler
const cosIdx = content.indexOf("cos_1.default");
const notFoundIdx = content.indexOf('接口不存在');
console.log('\nCode between cos and 404 handler:');
console.log(content.substring(cosIdx - 50, notFoundIdx + 100));

// Check if there's a try/catch wrapping the require
const commentRequireBlock = content.match(/require\("\.\/routes\/comment"\)[\s\S]{0,500}/);
if (commentRequireBlock) {
  console.log('\nAfter comment require:');
  console.log(commentRequireBlock[0].substring(0, 300));
}
