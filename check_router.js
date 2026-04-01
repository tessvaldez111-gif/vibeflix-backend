// Directly create a comment router and test it
const { query, getConnection } = require('/var/www/drama/server/dist/db');
const express = require('/var/www/drama/server/node_modules/express');
const auth = require('/var/www/drama/server/dist/middleware/auth');

console.log('query type:', typeof query);
console.log('getConnection type:', typeof getConnection);
console.log('requireAuth type:', typeof auth.requireAuth);
console.log('AuthRequest type:', typeof auth.AuthRequest);

// Check if query works
(async () => {
  try {
    const result = await query('SELECT 1 as test');
    console.log('DB query works:', result);
  } catch(e) {
    console.log('DB query error:', e.message);
  }
})();
