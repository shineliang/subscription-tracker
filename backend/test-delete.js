const db = require('./db/database');

console.log('Testing budget deletion with parameters...');

const query = `
  UPDATE budgets 
  SET is_active = false, updated_at = CURRENT_TIMESTAMP 
  WHERE id = $1 AND user_id = $2
`;

console.log('Query:', query);
console.log('Params:', [6, 3]);

db.run(query, [6, 3], function(err) {
  if (err) {
    console.error('Delete error:', err);
  } else {
    console.log('Delete result:');
    console.log('- this object:', this);
    console.log('- changes:', this ? this.changes : 'unknown');
    
    // Now check if it worked
    db.get('SELECT id, is_active FROM budgets WHERE id = $1', [6], (err, row) => {
      if (err) {
        console.error('Check error:', err);
      } else {
        console.log('Budget after update:', row);
      }
      process.exit(0);
    });
  }
});