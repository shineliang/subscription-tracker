const db = require('../db/database');
const moment = require('moment');
const SubscriptionHistory = require('./subscriptionHistory');
const PaymentHistory = require('./paymentHistory');

class Subscription {
  // 获取用户的所有订阅
  static getAllByUser(userId, callback) {
    const query = `
      SELECT * FROM subscriptions 
      WHERE user_id = ?
      ORDER BY next_payment_date ASC
    `;
    
    db.all(query, [userId], (err, rows) => {
      if (err) {
        return callback(err, null);
      }
      callback(null, rows);
    });
  }
  
  // 获取所有订阅（管理员用）
  static getAll(callback) {
    const query = `
      SELECT * FROM subscriptions 
      ORDER BY next_payment_date ASC
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        return callback(err, null);
      }
      callback(null, rows);
    });
  }

  // 获取单个订阅（验证用户权限）
  static getByIdAndUser(id, userId, callback) {
    const query = `
      SELECT * FROM subscriptions 
      WHERE id = ? AND user_id = ?
    `;
    
    db.get(query, [id, userId], (err, row) => {
      if (err) {
        return callback(err, null);
      }
      callback(null, row);
    });
  }
  
  // 获取单个订阅（不验证用户）
  static getById(id, callback) {
    const query = `
      SELECT * FROM subscriptions 
      WHERE id = ?
    `;
    
    db.get(query, [id], (err, row) => {
      if (err) {
        return callback(err, null);
      }
      callback(null, row);
    });
  }

  // 创建新订阅
  static create(subscription, callback) {
    const {
      user_id,
      name,
      description,
      provider,
      amount,
      currency,
      billing_cycle,
      cycle_count,
      start_date,
      next_payment_date,
      reminder_days,
      category,
      active,
      cancelled_at
    } = subscription;

    const query = `
      INSERT INTO subscriptions (
        user_id, name, description, provider, amount, currency, 
        billing_cycle, cycle_count, start_date, next_payment_date, 
        reminder_days, category, active, cancelled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(
      query, 
      [
        user_id,
        name, 
        description, 
        provider,
        amount, 
        currency, 
        billing_cycle, 
        cycle_count || 1, 
        start_date, 
        next_payment_date, 
        reminder_days || 7, 
        category, 
        active || 1,
        cancelled_at || null
      ], 
      function(err) {
        if (err) {
          return callback(err, null);
        }
        const newSubscription = { id: this.lastID, ...subscription };
        
        // 记录创建历史
        SubscriptionHistory.recordChange(
          newSubscription.id, 
          user_id, 
          'created', 
          null,
          '新建订阅',
          (histErr) => {
            if (histErr) {
              console.error('记录订阅历史失败:', histErr);
            }
          }
        );
        
        callback(null, newSubscription);
      }
    );
  }

  // 更新订阅（验证用户权限）
  static updateByUser(id, userId, subscription, callback) {
    // 首先获取旧的订阅数据以记录变更
    this.getByIdAndUser(id, userId, (err, oldSubscription) => {
      if (err) return callback(err);
      if (!oldSubscription) return callback(new Error('订阅不存在或无权限'));
      
      const {
        name,
        description,
        provider,
        amount,
        currency,
        billing_cycle,
        cycle_count,
        start_date,
        next_payment_date,
        reminder_days,
        category,
        active,
        cancelled_at
      } = subscription;

      const query = `
        UPDATE subscriptions 
        SET name = ?, description = ?, provider = ?, amount = ?, 
            currency = ?, billing_cycle = ?, cycle_count = ?, 
            start_date = ?, next_payment_date = ?, reminder_days = ?, 
            category = ?, active = ?, cancelled_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `;
      
      db.run(
        query, 
        [
          name, 
          description, 
          provider, 
          amount, 
          currency, 
          billing_cycle, 
          cycle_count || 1, 
          start_date, 
          next_payment_date, 
          reminder_days || 7, 
          category, 
          active !== undefined ? active : 1,
          cancelled_at !== undefined ? cancelled_at : null,
          id,
          userId
        ], 
        function(err) {
          if (err) {
            return callback(err, null);
          }
          if (this.changes === 0) {
            return callback(new Error('订阅不存在或无权限'), null);
          }
          
          // 记录变更历史
          const changes = {};
          const fieldsToTrack = ['name', 'amount', 'currency', 'billing_cycle', 'provider', 'category', 'active'];
          
          fieldsToTrack.forEach(field => {
            const newValue = subscription[field];
            const oldValue = oldSubscription[field];
            
            if (newValue !== undefined && newValue !== oldValue) {
              changes[field] = {
                oldValue: oldValue,
                newValue: newValue
              };
            }
          });
          
          if (Object.keys(changes).length > 0) {
            SubscriptionHistory.recordChange(
              id,
              userId,
              'updated',
              changes,
              null,
              (histErr) => {
                if (histErr) {
                  console.error('记录订阅历史失败:', histErr);
                }
              }
            );
          }
          
          callback(null, { id, ...subscription });
        }
      );
    });
  }
  
  // 更新订阅（不验证用户）
  static update(id, subscription, callback) {
    const {
      name,
      description,
      provider,
      amount,
      currency,
      billing_cycle,
      cycle_count,
      start_date,
      next_payment_date,
      reminder_days,
      category,
      active,
      cancelled_at
    } = subscription;

    const query = `
      UPDATE subscriptions 
      SET name = ?,
          description = ?,
          provider = ?,
          amount = ?,
          currency = ?,
          billing_cycle = ?,
          cycle_count = ?,
          start_date = ?,
          next_payment_date = ?,
          reminder_days = ?,
          category = ?,
          active = ?,
          cancelled_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    db.run(
      query, 
      [
        name, 
        description, 
        provider,
        amount, 
        currency, 
        billing_cycle, 
        cycle_count, 
        start_date, 
        next_payment_date, 
        reminder_days, 
        category, 
        active,
        cancelled_at !== undefined ? cancelled_at : null,
        id
      ], 
      function(err) {
        if (err) {
          return callback(err, null);
        }
        callback(null, { id, ...subscription });
      }
    );
  }

  // 删除订阅（验证用户权限）- 实际上是软删除
  static deleteByUser(id, userId, callback) {
    // 先检查订阅是否存在
    this.getByIdAndUser(id, userId, (err, subscription) => {
      if (err) return callback(err);
      if (!subscription) return callback(new Error('订阅不存在或无权限'));
      
      const query = `UPDATE subscriptions SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`;
      
      db.run(query, [id, userId], function(err) {
        if (err) {
          return callback(err, null);
        }
        if (this.changes === 0) {
          return callback(new Error('订阅不存在或无权限'), null);
        }
        
        // 记录取消历史
        SubscriptionHistory.recordChange(
          id,
          userId,
          'cancelled',
          null,
          '订阅已取消',
          (histErr) => {
            if (histErr) {
              console.error('记录订阅历史失败:', histErr);
            }
          }
        );
        
        callback(null, { id, deleted: true });
      });
    });
  }
  
  // 删除订阅（不验证用户）
  static delete(id, callback) {
    const query = `DELETE FROM subscriptions WHERE id = ?`;
    
    db.run(query, [id], function(err) {
      if (err) {
        return callback(err, null);
      }
      callback(null, { id, deleted: true });
    });
  }

  // 获取用户即将到期的订阅
  static getUpcomingByUser(userId, days = 7, callback) {
    const today = moment().format('YYYY-MM-DD');
    const futureDate = moment().add(days, 'days').format('YYYY-MM-DD');
    
    const query = `
      SELECT * FROM subscriptions 
      WHERE user_id = ?
      AND next_payment_date BETWEEN ? AND ?
      AND active = 1
      AND cancelled_at IS NULL
      ORDER BY next_payment_date ASC
    `;
    
    db.all(query, [userId, today, futureDate], (err, rows) => {
      if (err) {
        return callback(err, null);
      }
      callback(null, rows);
    });
  }
  
  // 获取即将到期的订阅（所有用户）
  static getUpcoming(days = 7, callback) {
    const today = moment().format('YYYY-MM-DD');
    const futureDate = moment().add(days, 'days').format('YYYY-MM-DD');
    
    const query = `
      SELECT * FROM subscriptions 
      WHERE next_payment_date BETWEEN ? AND ?
      AND active = 1
      AND cancelled_at IS NULL
      ORDER BY next_payment_date ASC
    `;
    
    db.all(query, [today, futureDate], (err, rows) => {
      if (err) {
        return callback(err, null);
      }
      callback(null, rows);
    });
  }
  
  // 获取已过期但未续费的订阅
  static getExpired(callback) {
    const today = moment().format('YYYY-MM-DD');
    
    const query = `
      SELECT * FROM subscriptions 
      WHERE next_payment_date < ?
      AND active = 1
      ORDER BY next_payment_date ASC
    `;
    
    db.all(query, [today], (err, rows) => {
      if (err) {
        return callback(err, null);
      }
      callback(null, rows);
    });
  }

  // 计算每月花费
  static getMonthlySpending(callback) {
    const query = `
      SELECT 
        CASE
          WHEN billing_cycle = 'monthly' THEN amount
          WHEN billing_cycle = 'yearly' THEN amount / 12
          WHEN billing_cycle = 'half_yearly' THEN amount / 6
          WHEN billing_cycle = 'quarterly' THEN amount / 3
          WHEN billing_cycle = 'weekly' THEN amount * 4.33
          WHEN billing_cycle = 'daily' THEN amount * 30.44
          ELSE amount
        END as monthly_amount,
        currency,
        billing_cycle
      FROM subscriptions
      WHERE active = 1
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        return callback(err, null);
      }
      
      // 按货币分组计算总额
      const totals = {};
      rows.forEach(row => {
        if (!totals[row.currency]) {
          totals[row.currency] = 0;
        }
        totals[row.currency] += row.monthly_amount;
      });
      
      callback(null, { 
        details: rows,
        totals: totals
      });
    });
  }

  // 计算每年花费
  static getYearlySpending(callback) {
    const query = `
      SELECT 
        CASE
          WHEN billing_cycle = 'monthly' THEN amount * 12
          WHEN billing_cycle = 'yearly' THEN amount
          WHEN billing_cycle = 'half_yearly' THEN amount * 2
          WHEN billing_cycle = 'quarterly' THEN amount * 4
          WHEN billing_cycle = 'weekly' THEN amount * 52
          WHEN billing_cycle = 'daily' THEN amount * 365
          ELSE amount
        END as yearly_amount,
        currency,
        billing_cycle
      FROM subscriptions
      WHERE active = 1
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        return callback(err, null);
      }
      
      // 按货币分组计算总额
      const totals = {};
      rows.forEach(row => {
        if (!totals[row.currency]) {
          totals[row.currency] = 0;
        }
        totals[row.currency] += row.yearly_amount;
      });
      
      callback(null, { 
        details: rows,
        totals: totals
      });
    });
  }

  // 按类别分组统计(增强版本)
  static getSpendingByCategory(timeframe = 'monthly', callback) {
    // 根据时间范围选择合适的计算方法
    const amountExpression = timeframe === 'monthly' ? 
      `CASE
        WHEN billing_cycle = 'monthly' THEN amount
        WHEN billing_cycle = 'yearly' THEN amount / 12
        WHEN billing_cycle = 'half_yearly' THEN amount / 6
        WHEN billing_cycle = 'quarterly' THEN amount / 3
        WHEN billing_cycle = 'weekly' THEN amount * 4.33
        WHEN billing_cycle = 'daily' THEN amount * 30.44
        ELSE amount
      END` : 
      `CASE
        WHEN billing_cycle = 'monthly' THEN amount * 12
        WHEN billing_cycle = 'yearly' THEN amount
        WHEN billing_cycle = 'half_yearly' THEN amount * 2
        WHEN billing_cycle = 'quarterly' THEN amount * 4
        WHEN billing_cycle = 'weekly' THEN amount * 52
        WHEN billing_cycle = 'daily' THEN amount * 365
        ELSE amount
      END`;
    
    const query = `
      SELECT 
        category,
        COUNT(*) as subscription_count,
        SUM(${amountExpression}) as total_amount,
        currency
      FROM subscriptions
      WHERE active = 1
      GROUP BY category, currency
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        return callback(err, null);
      }
      callback(null, rows);
    });
  }

  // 获取月度趋势数据
  static getMonthlyTrend(callback) {
    const months = 12; // 获取过去12个月的数据
    const results = [];
    
    // 生成过去12个月的月份列表
    for (let i = 0; i < months; i++) {
      const monthDate = moment().subtract(i, 'months');
      const monthName = monthDate.format('YYYY-MM');
      const monthStart = monthDate.startOf('month').format('YYYY-MM-DD');
      const monthEnd = monthDate.endOf('month').format('YYYY-MM-DD');
      
      results.push({
        month: monthName,
        label: monthDate.format('YYYY年M月'),
        monthStart: monthStart,
        monthEnd: monthEnd
      });
    }
    
    // 查询所有活跃订阅
    const query = `
      SELECT 
        id,
        name,
        amount,
        currency,
        billing_cycle,
        start_date,
        next_payment_date
      FROM subscriptions
      WHERE active = 1
    `;
    
    db.all(query, [], (err, subscriptions) => {
      if (err) {
        return callback(err, null);
      }
      
      // 计算每个订阅在每个月的支出
      results.forEach(month => {
        const monthlyCosts = {};
        
        subscriptions.forEach(sub => {
          // 检查订阅在当前月是否应该计算（开始日期早于或等于月末）
          const startDate = moment(sub.start_date);
          const monthEnd = moment(month.monthEnd);
          
          if (startDate.isSameOrBefore(monthEnd)) {
            // 根据计费周期计算该月应该的支出
            let monthlyAmount = 0;
            
            switch (sub.billing_cycle) {
              case 'monthly':
                // 每月付款
                monthlyAmount = sub.amount;
                break;
              case 'yearly':
                // 年付，分摊到每个月
                monthlyAmount = sub.amount / 12;
                break;
              case 'half_yearly':
                // 半年付，分摊到每个月
                monthlyAmount = sub.amount / 6;
                break;
              case 'quarterly':
                // 季付，分摊到每个月
                monthlyAmount = sub.amount / 3;
                break;
              case 'weekly':
                // 周付，乘以一个月的平均周数
                monthlyAmount = sub.amount * 4.33;
                break;
              case 'daily':
                // 日付，乘以一个月的平均天数
                monthlyAmount = sub.amount * 30.44;
                break;
              default:
                monthlyAmount = sub.amount;
            }
            
            // 增加到该货币的总额中
            if (!monthlyCosts[sub.currency]) {
              monthlyCosts[sub.currency] = 0;
            }
            monthlyCosts[sub.currency] += monthlyAmount;
          }
        });
        
        // 设置该月的总支出
        month.amounts = monthlyCosts;
        month.amount = monthlyCosts['CNY'] || 0; // 默认展示CNY
        month.currency = 'CNY';
      });
      
      // 按月份降序排序（从最近到最远）
      results.sort((a, b) => {
        return moment(b.month).diff(moment(a.month));
      });
      
      callback(null, results);
    });
  }

  // 计算用户的每月花费
  static getMonthlySpendingByUser(userId, callback) {
    const query = `
      SELECT 
        CASE
          WHEN billing_cycle = 'monthly' THEN amount
          WHEN billing_cycle = 'yearly' THEN amount / 12
          WHEN billing_cycle = 'half_yearly' THEN amount / 6
          WHEN billing_cycle = 'quarterly' THEN amount / 3
          WHEN billing_cycle = 'weekly' THEN amount * 4.33
          WHEN billing_cycle = 'daily' THEN amount * 30.44
          ELSE amount
        END as monthly_amount,
        currency,
        billing_cycle
      FROM subscriptions
      WHERE active = 1 AND user_id = ?
    `;
    
    db.all(query, [userId], (err, rows) => {
      if (err) {
        return callback(err, null);
      }
      
      // 按货币分组计算总额
      const totals = {};
      rows.forEach(row => {
        if (!totals[row.currency]) {
          totals[row.currency] = 0;
        }
        totals[row.currency] += row.monthly_amount;
      });
      
      callback(null, { 
        details: rows,
        totals: totals
      });
    });
  }

  // 计算用户的每年花费
  static getYearlySpendingByUser(userId, callback) {
    const query = `
      SELECT 
        CASE
          WHEN billing_cycle = 'monthly' THEN amount * 12
          WHEN billing_cycle = 'yearly' THEN amount
          WHEN billing_cycle = 'half_yearly' THEN amount * 2
          WHEN billing_cycle = 'quarterly' THEN amount * 4
          WHEN billing_cycle = 'weekly' THEN amount * 52
          WHEN billing_cycle = 'daily' THEN amount * 365
          ELSE amount
        END as yearly_amount,
        currency,
        billing_cycle
      FROM subscriptions
      WHERE active = 1 AND user_id = ?
    `;
    
    db.all(query, [userId], (err, rows) => {
      if (err) {
        return callback(err, null);
      }
      
      // 按货币分组计算总额
      const totals = {};
      rows.forEach(row => {
        if (!totals[row.currency]) {
          totals[row.currency] = 0;
        }
        totals[row.currency] += row.yearly_amount;
      });
      
      callback(null, { 
        details: rows,
        totals: totals
      });
    });
  }

  // 按类别分组统计用户的支出
  static getSpendingByCategoryByUser(userId, timeframe = 'monthly', callback) {
    // 根据时间范围选择合适的计算方法
    const amountExpression = timeframe === 'monthly' ? 
      `CASE
        WHEN billing_cycle = 'monthly' THEN amount
        WHEN billing_cycle = 'yearly' THEN amount / 12
        WHEN billing_cycle = 'half_yearly' THEN amount / 6
        WHEN billing_cycle = 'quarterly' THEN amount / 3
        WHEN billing_cycle = 'weekly' THEN amount * 4.33
        WHEN billing_cycle = 'daily' THEN amount * 30.44
        ELSE amount
      END` : 
      `CASE
        WHEN billing_cycle = 'monthly' THEN amount * 12
        WHEN billing_cycle = 'yearly' THEN amount
        WHEN billing_cycle = 'half_yearly' THEN amount * 2
        WHEN billing_cycle = 'quarterly' THEN amount * 4
        WHEN billing_cycle = 'weekly' THEN amount * 52
        WHEN billing_cycle = 'daily' THEN amount * 365
        ELSE amount
      END`;
    
    const query = `
      SELECT 
        category,
        COUNT(*) as subscription_count,
        SUM(${amountExpression}) as total_amount,
        currency
      FROM subscriptions
      WHERE active = 1 AND user_id = ?
      GROUP BY category, currency
    `;
    
    db.all(query, [userId], (err, rows) => {
      if (err) {
        return callback(err, null);
      }
      callback(null, rows);
    });
  }

  // 获取用户的月度趋势数据
  static getMonthlyTrendByUser(userId, callback) {
    const PaymentHistory = require('./paymentHistory');
    const months = 12; // 获取过去12个月的数据
    const results = [];
    const promises = [];
    
    // 生成过去12个月的月份列表
    for (let i = months - 1; i >= 0; i--) {
      const monthDate = moment().subtract(i, 'months');
      const monthName = monthDate.format('YYYY-MM');
      const monthStart = monthDate.clone().startOf('month').format('YYYY-MM-DD');
      const monthEnd = monthDate.clone().endOf('month').format('YYYY-MM-DD');
      
      const monthData = {
        month: monthName,
        label: monthDate.format('YYYY年M月'),
        monthStart: monthStart,
        monthEnd: monthEnd,
        amount: { CNY: 0 },
        subscriptionCounts: 0
      };
      
      results.push(monthData);
      
      // 获取该月的实际付款记录
      promises.push(new Promise((resolve) => {
        PaymentHistory.getByDateRange(userId, monthStart, monthEnd, (err, payments) => {
          if (!err && payments) {
            let monthTotal = 0;
            const uniqueSubscriptions = new Set();
            
            payments.forEach(payment => {
              if (payment.status === 'completed') {
                // 转换非CNY货币
                if (payment.currency === 'CNY') {
                  monthTotal += parseFloat(payment.amount);
                } else {
                  monthTotal += parseFloat(payment.amount) * 7; // 简单汇率转换
                }
                uniqueSubscriptions.add(payment.subscription_id);
              }
            });
            
            monthData.amount.CNY = monthTotal;
            monthData.subscriptionCounts = uniqueSubscriptions.size;
          }
          resolve();
        });
      }));
    }
    
    
    // 等待所有付款历史查询完成
    Promise.all(promises).then(() => {
      // 如果没有付款记录，则使用预估方式计算
      const hasPaymentData = results.some(month => month.amount.CNY > 0);
      
      if (!hasPaymentData) {
        // 查询用户的所有活跃订阅进行预估
        const query = `
          SELECT 
            id,
            name,
            amount,
            currency,
            billing_cycle,
            start_date,
            next_payment_date
          FROM subscriptions
          WHERE active = 1 AND user_id = ?
        `;
        
        db.all(query, [userId], (err, subscriptions) => {
          if (err) {
            return callback(err, null);
          }
          
          // 计算每个订阅在每个月的预估支出
          results.forEach(month => {
            let monthTotal = 0;
            const activeSubscriptions = [];
            
            subscriptions.forEach(sub => {
              // 检查订阅在当前月是否应该计算（开始日期早于或等于月末）
              const startDate = moment(sub.start_date);
              const monthEnd = moment(month.monthEnd);
              
              if (startDate.isSameOrBefore(monthEnd)) {
                activeSubscriptions.push(sub);
                // 根据计费周期计算该月应该的支出
                let monthlyAmount = 0;
                
                switch (sub.billing_cycle) {
                  case 'monthly':
                    monthlyAmount = sub.amount;
                    break;
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
                }
                
                // 转换非CNY货币
                if (sub.currency === 'CNY') {
                  monthTotal += monthlyAmount;
                } else {
                  monthTotal += monthlyAmount * 7; // 简单汇率转换
                }
              }
            });
            
            month.amount.CNY = Math.round(monthTotal * 100) / 100;
            month.subscriptionCounts = activeSubscriptions.length;
          });
          
          callback(null, results);
        });
      } else {
        // 有付款记录，直接返回
        callback(null, results);
      }
    }).catch(err => {
      callback(err, null);
    });
  }
}

module.exports = Subscription;
