const Budget = require('./models/budget');

// Create a test budget
const testBudget = {
  user_id: 3,
  name: 'Test Budget for Deletion',
  type: 'total',
  period: 'monthly',
  amount: 500,
  currency: 'CNY',
  category: null,
  warning_threshold: 80
};

console.log('Creating test budget...');
Budget.create(testBudget, (err, newBudget) => {
  if (err) {
    console.error('Create error:', err);
    process.exit(1);
  }
  
  console.log('Created budget:', newBudget);
  
  // Now try to delete it
  console.log('Attempting to delete budget...');
  Budget.deleteByUser(newBudget.id, 3, (err, result) => {
    if (err) {
      console.error('Delete error:', err);
      process.exit(1);
    }
    
    console.log('Delete result:', result);
    
    // Verify it's deleted
    Budget.getAllByUser(3, (err, budgets) => {
      if (err) {
        console.error('Get all error:', err);
        process.exit(1);
      }
      
      console.log('Active budgets after deletion:', budgets.length);
      const stillExists = budgets.find(b => b.id === newBudget.id);
      console.log('Deleted budget still in list?', !!stillExists);
      
      process.exit(0);
    });
  });
});