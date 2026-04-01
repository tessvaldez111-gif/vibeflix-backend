const fs = require('fs');
const path = '/var/www/drama/server/dist/routes/comment.js';
const content = fs.readFileSync(path, 'utf-8');

// Check what's actually exported
const exportMatches = content.match(/exports\.\w+\s*=/g);
console.log('Exports:', exportMatches);

// Check require statements
const requireMatches = content.match(/require\([^)]+\)/g);
console.log('\nRequires:', requireMatches);

// Check the first 3 lines of actual code (after "use strict")
const lines = content.split('\n').filter(l => l.trim() && !l.includes('"use strict"') && !l.includes('__importDefault'));
console.log('\nFirst 10 code lines:');
lines.slice(0, 10).forEach((l, i) => console.log(i, l));

// Check if Router is properly created
console.log('\nHas Router:', content.includes('express_1'));
console.log('Has router.get:', content.includes('router.get'));
console.log('Has router.post:', content.includes('router.post'));
