const c = require('/var/www/drama/server/dist/routes/comment');
const d = require('/var/www/drama/server/dist/routes/drama');
console.log('comment default:', typeof c.default);
console.log('drama default:', typeof d.default);
console.log('comment proto:', Object.getOwnPropertyNames(Object.getPrototypeOf(c.default)));
console.log('drama proto:', Object.getOwnPropertyNames(Object.getPrototypeOf(d.default)));
console.log('comment stack:', c.default.stack?.length);
console.log('drama stack:', d.default.stack?.length);

// Check if they share the same Router constructor
console.log('Same constructor:', c.default.constructor === d.default.constructor);
console.log('Comment constructor name:', c.default.constructor.name);
