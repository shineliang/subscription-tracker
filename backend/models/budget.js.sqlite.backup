const db = require('../db/database');
const moment = require('moment');

class Budget {
  // 获取用户的所有预算
  static getAllByUser(userId, callback) {
    const query = `
      SELECT * FROM budgets 
      WHERE user_id = ? AND is_active = 1
      ORDER BY type, period, category
    `;
    
    db.all(query, [userId], (err, rows) => {
      if (err) {
        return callback(err, null);
      }
      callback(null, rows);
    });
  }

  // 获取单个预算
  static getByIdAndUser(id, userId, callback) {
    const query = `
      SELECT * FROM budgets 
      WHERE id = ? AND user_id = ?
    `;
    
    db.get(query, [id, userId], (err, row) => {
      if (err) {
        return callback(err, null);
      }
      callback(null, row);
    });
  }

  // 获取特定类型和周期的预算
  static getByTypeAndPeriod(userId, type, period, category, callback) {
    let query = `
      SELECT * FROM budgets 
      WHERE user_id = ? AND type = ? AND period = ? AND is_active = 1
    `;
    const params = [userId, type, period];
    
    if (type === 'category' && category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    db.get(query, params, (err, row) => {
      if (err) {
        return callback(err, null);
      }
      callback(null, row);
    });
  }

  // 创建新预算
  static create(budget, callback) {
    const {
      user_id,
      name,
      type,
      period,
      amount,
      currency,
      category,
      warning_threshold,
      start_date,
      end_date
    } = budget;

    const query = `
      INSERT INTO budgets (
        user_id, name, type, period, amount, currency, 
        category, warning_threshold, start_date, end_date, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;
    
    db.run(
      query, 
      [
        user_id,
        name,
        type,
        period,
        amount,
        currency || 'CNY',
        category,
        warning_threshold || 80,
        start_date,
        end_date
      ], 
      function(err) {
        if (err) {
          return callback(err, null);
        }
        const newBudget = { id: this.lastID, ...budget };
        callback(null, newBudget);
      }
    );
  }

  // 更新预算
  static updateByUser(id, userId, budget, callback) {
    const {
      name,
      amount,
      currency,
      warning_threshold,
      is_active,
      start_date,
      end_date
    } = budget;

    const query = `
      UPDATE budgets 
      SET name = ?, amount = ?, currency = ?, warning_threshold = ?, 
          is_active = ?, start_date = ?, end_date = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `;
    
    db.run(
      query, 
      [
        name,
        amount,
        currency,
        warning_threshold,
        is_active,
        start_date,
        end_date,
        id,
        userId
      ], 
      function(err) {
        if (err) {
          return callback(err, null);
        }
        if (this.changes === 0) {
          return callback(new Error('预算不存在或无权限'), null);
        }
        callback(null, { id, ...budget });
      }
    );
  }

  // 删除预算（软删除）
  static deleteByUser(id, userId, callback) {
    const query = `
      UPDATE budgets 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ?
    `;
    
    db.run(query, [id, userId], function(err) {
      if (err) {
        return callback(err, null);
      }
      if (this.changes === 0) {
        return callback(new Error('预算不存在或无权限'), null);
      }
      callback(null, { id, deleted: true });
    });
  }

  // 获取当前周期的预算使用情况
  static getBudgetUsage(userId, budgetId, callback) {
    this.getByIdAndUser(budgetId, userId, (err, budget) => {
      if (err) return callback(err);
      if (!budget) return callback(new Error('预算不存在'));

      // 计算当前周期的起止日期
      const now = moment();
      let periodStart, periodEnd;

      if (budget.period === 'monthly') {
        periodStart = now.clone().startOf('month').format('YYYY-MM-DD');
        periodEnd = now.clone().endOf('month').format('YYYY-MM-DD');
      } else if (budget.period === 'yearly') {
        periodStart = now.clone().startOf('year').format('YYYY-MM-DD');
        periodEnd = now.clone().endOf('year').format('YYYY-MM-DD');
      }

      // 查询该周期内的支出
      let query;
      let params;

      if (budget.type === 'total') {
        // 总预算：计算所有订阅的支出
        query = `
          SELECT 
            SUM(CASE
              WHEN billing_cycle = 'monthly' THEN amount
              WHEN billing_cycle = 'yearly' THEN amount / 12
              WHEN billing_cycle = 'half_yearly' THEN amount / 6
              WHEN billing_cycle = 'quarterly' THEN amount / 3
              WHEN billing_cycle = 'weekly' THEN amount * 4.33
              WHEN billing_cycle = 'daily' THEN amount * 30.44
              ELSE amount
            END) as spent_amount
          FROM subscriptions
          WHERE user_id = ? 
            AND active = 1 
            AND cancelled_at IS NULL
            AND currency = ?
        `;
        params = [userId, budget.currency];
      } else {
        // 分类预算：只计算特定类别的支出
        query = `
          SELECT 
            SUM(CASE
              WHEN billing_cycle = 'monthly' THEN amount
              WHEN billing_cycle = 'yearly' THEN amount / 12
              WHEN billing_cycle = 'half_yearly' THEN amount / 6
              WHEN billing_cycle = 'quarterly' THEN amount / 3
              WHEN billing_cycle = 'weekly' THEN amount * 4.33
              WHEN billing_cycle = 'daily' THEN amount * 30.44
              ELSE amount
            END) as spent_amount
          FROM subscriptions
          WHERE user_id = ? 
            AND active = 1 
            AND cancelled_at IS NULL
            AND currency = ?
            AND category = ?
        `;
        params = [userId, budget.currency, budget.category];
      }

      // 如果是年度预算，需要乘以12
      if (budget.period === 'yearly') {
        query = query.replace(
          'END) as spent_amount',
          'END) * 12 as spent_amount'
        );
      }

      db.get(query, params, (err, result) => {
        if (err) return callback(err);

        const spentAmount = result.spent_amount || 0;
        const remainingAmount = budget.amount - spentAmount;
        const usagePercentage = budget.amount > 0 ? 
          (spentAmount / budget.amount * 100).toFixed(2) : 0;

        const usage = {
          budget_id: budgetId,
          budget_name: budget.name,
          budget_type: budget.type,
          budget_period: budget.period,
          budget_category: budget.category,
          budget_amount: budget.amount,
          spent_amount: spentAmount,
          remaining_amount: remainingAmount,
          usage_percentage: parseFloat(usagePercentage),
          currency: budget.currency,
          period_start: periodStart,
          period_end: periodEnd,
          exceeded: spentAmount > budget.amount,
          warning_threshold: budget.warning_threshold,
          warning_triggered: parseFloat(usagePercentage) >= budget.warning_threshold
        };

        callback(null, usage);
      });
    });
  }

  // 获取所有预算的使用情况汇总
  static getAllBudgetUsage(userId, callback) {
    this.getAllByUser(userId, (err, budgets) => {
      if (err) return callback(err);
      
      if (!budgets || budgets.length === 0) {
        return callback(null, []);
      }

      const usagePromises = budgets.map(budget => {
        return new Promise((resolve, reject) => {
          this.getBudgetUsage(userId, budget.id, (err, usage) => {
            if (err) reject(err);
            else resolve(usage);
          });
        });
      });

      Promise.all(usagePromises)
        .then(usages => callback(null, usages))
        .catch(err => callback(err));
    });
  }

  // 检查并创建预算警告
  static checkAndCreateAlerts(userId, callback) {
    this.getAllBudgetUsage(userId, (err, usages) => {
      if (err) return callback(err);

      const alerts = [];
      
      usages.forEach(usage => {
        if (usage.exceeded) {
          // 预算已超支
          alerts.push({
            budget_id: usage.budget_id,
            user_id: userId,
            alert_type: 'exceeded',
            usage_percentage: usage.usage_percentage,
            message: `您的${usage.budget_name}已超支！当前支出${usage.spent_amount}${usage.currency}，超出预算${Math.abs(usage.remaining_amount)}${usage.currency}`
          });
        } else if (usage.warning_triggered) {
          // 达到预警阈值
          alerts.push({
            budget_id: usage.budget_id,
            user_id: userId,
            alert_type: 'warning',
            usage_percentage: usage.usage_percentage,
            message: `您的${usage.budget_name}使用率已达${usage.usage_percentage}%，请注意控制支出`
          });
        }
      });

      if (alerts.length === 0) {
        return callback(null, []);
      }

      // 批量插入警告
      const insertPromises = alerts.map(alert => {
        return new Promise((resolve, reject) => {
          // 检查是否已存在相同的未读警告
          const checkQuery = `
            SELECT id FROM budget_alerts 
            WHERE budget_id = ? AND user_id = ? AND alert_type = ? 
              AND is_read = 0 AND DATE(created_at) = DATE('now')
          `;
          
          db.get(checkQuery, [alert.budget_id, alert.user_id, alert.alert_type], (err, existing) => {
            if (err) return reject(err);
            if (existing) return resolve(null); // 今天已有相同警告，跳过
            
            const insertQuery = `
              INSERT INTO budget_alerts (budget_id, user_id, alert_type, usage_percentage, message)
              VALUES (?, ?, ?, ?, ?)
            `;
            
            db.run(insertQuery, [
              alert.budget_id,
              alert.user_id,
              alert.alert_type,
              alert.usage_percentage,
              alert.message
            ], function(err) {
              if (err) reject(err);
              else resolve({ id: this.lastID, ...alert });
            });
          });
        });
      });

      Promise.all(insertPromises)
        .then(results => {
          const newAlerts = results.filter(r => r !== null);
          callback(null, newAlerts);
        })
        .catch(err => callback(err));
    });
  }

  // 获取未读警告
  static getUnreadAlerts(userId, callback) {
    const query = `
      SELECT ba.*, b.name as budget_name, b.type, b.period, b.category
      FROM budget_alerts ba
      JOIN budgets b ON ba.budget_id = b.id
      WHERE ba.user_id = ? AND ba.is_read = 0
      ORDER BY ba.created_at DESC
    `;
    
    db.all(query, [userId], (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    });
  }

  // 标记警告为已读
  static markAlertsAsRead(userId, alertIds, callback) {
    if (!alertIds || alertIds.length === 0) {
      return callback(null, { updated: 0 });
    }
    
    const placeholders = alertIds.map(() => '?').join(',');
    const query = `
      UPDATE budget_alerts 
      SET is_read = 1 
      WHERE user_id = ? AND id IN (${placeholders})
    `;
    
    db.run(query, [userId, ...alertIds], function(err) {
      if (err) return callback(err);
      callback(null, { updated: this.changes });
    });
  }

  // 记录预算历史（用于月末/年末存档）
  static recordBudgetHistory(userId, budgetId, callback) {
    this.getBudgetUsage(userId, budgetId, (err, usage) => {
      if (err) return callback(err);
      
      const query = `
        INSERT INTO budget_history (
          budget_id, user_id, period_start, period_end,
          budget_amount, spent_amount, remaining_amount,
          usage_percentage, exceeded
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      db.run(query, [
        budgetId,
        userId,
        usage.period_start,
        usage.period_end,
        usage.budget_amount,
        usage.spent_amount,
        usage.remaining_amount,
        usage.usage_percentage,
        usage.exceeded ? 1 : 0
      ], function(err) {
        if (err) return callback(err);
        callback(null, { id: this.lastID, ...usage });
      });
    });
  }
}

module.exports = Budget;