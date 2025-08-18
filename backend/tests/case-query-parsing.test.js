const { describe, test, expect } = require('@jest/globals');

// 模拟复杂查询的回退逻辑测试
function calculateSpentAmount(subscriptions) {
  return subscriptions.reduce((sum, sub) => {
    let monthlyAmount = sub.amount;
    
    switch (sub.billing_cycle) {
      case 'yearly':
        monthlyAmount = sub.amount / 12;
        break;
      case 'half_yearly':
        monthlyAmount = sub.amount / 6;
        break;
      case 'quarterly':
        monthlyAmount = sub.amount / 3;
        break;
      case 'weekly':
        monthlyAmount = sub.amount * 4.33;
        break;
      case 'daily':
        monthlyAmount = sub.amount * 30.44;
        break;
      default:
        monthlyAmount = sub.amount; // monthly or default
    }
    
    return sum + monthlyAmount;
  }, 0);
}

describe('CASE Query Fallback Logic Tests', () => {
  test('Should calculate monthly amounts correctly for different billing cycles', () => {
    const subscriptions = [
      { amount: 100, billing_cycle: 'monthly' },
      { amount: 1200, billing_cycle: 'yearly' },
      { amount: 600, billing_cycle: 'half_yearly' },
      { amount: 300, billing_cycle: 'quarterly' },
      { amount: 25, billing_cycle: 'weekly' },
      { amount: 3, billing_cycle: 'daily' }
    ];

    const result = calculateSpentAmount(subscriptions);
    
    // Expected calculation:
    // monthly: 100
    // yearly: 1200 / 12 = 100
    // half_yearly: 600 / 6 = 100
    // quarterly: 300 / 3 = 100
    // weekly: 25 * 4.33 = 108.25
    // daily: 3 * 30.44 = 91.32
    // Total: 599.57
    
    expect(result).toBeCloseTo(599.57, 2);
  });

  test('Should handle empty subscription list', () => {
    const result = calculateSpentAmount([]);
    expect(result).toBe(0);
  });

  test('Should handle only monthly subscriptions', () => {
    const subscriptions = [
      { amount: 50, billing_cycle: 'monthly' },
      { amount: 30, billing_cycle: 'monthly' }
    ];

    const result = calculateSpentAmount(subscriptions);
    expect(result).toBe(80);
  });

  test('Should handle mixed currency scenarios', () => {
    const subscriptions = [
      { amount: 10, billing_cycle: 'monthly' },
      { amount: 120, billing_cycle: 'yearly' },
      { amount: 180, billing_cycle: 'half_yearly' }
    ];

    const result = calculateSpentAmount(subscriptions);
    
    // Expected: 10 + (120/12) + (180/6) = 10 + 10 + 30 = 50
    expect(result).toBe(50);
  });

  test('Should handle unknown billing cycles as monthly', () => {
    const subscriptions = [
      { amount: 100, billing_cycle: 'unknown' },
      { amount: 50, billing_cycle: null }
    ];

    const result = calculateSpentAmount(subscriptions);
    expect(result).toBe(150); // Both treated as monthly
  });
});