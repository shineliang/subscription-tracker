const { Pool } = require('pg');
require('dotenv').config();

// 源PostgreSQL数据库配置
const sourceConfig = {
  host: process.env.PG_HOST || '192.168.1.73',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'subscription_tracker',
  user: process.env.PG_USER || 'subscription_app',
  password: process.env.PG_PASSWORD || 'sub_app_2024',
};

// 目标Supabase数据库配置
const targetConfig = {
  host: process.env.SUPABASE_DB_HOST || 'db.cwmtexaliunqpyjnancf.supabase.co',
  port: process.env.SUPABASE_DB_PORT || 5432,
  database: process.env.SUPABASE_DB_NAME || 'postgres',
  user: process.env.SUPABASE_DB_USER || 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
};

const sourcePool = new Pool(sourceConfig);
const targetPool = new Pool(targetConfig);

async function migrateData() {
  console.log('开始数据迁移...');
  
  try {
    // 测试连接
    console.log('测试源数据库连接...');
    await sourcePool.query('SELECT 1');
    console.log('源数据库连接成功');
    
    console.log('测试目标数据库连接...');
    await targetPool.query('SELECT 1');
    console.log('目标数据库连接成功');
    
    // 开始事务
    await targetPool.query('BEGIN');
    
    // 清空目标数据库（按顺序删除，避免外键约束）
    console.log('清空目标数据库...');
    await targetPool.query('DELETE FROM budget_alerts');
    await targetPool.query('DELETE FROM budget_history');
    await targetPool.query('DELETE FROM budgets');
    await targetPool.query('DELETE FROM payment_history');
    await targetPool.query('DELETE FROM subscription_history');
    await targetPool.query('DELETE FROM notification_settings');
    await targetPool.query('DELETE FROM reminders');
    await targetPool.query('DELETE FROM subscriptions');
    await targetPool.query('DELETE FROM users');
    
    // 1. 迁移users表
    console.log('迁移users表...');
    const users = await sourcePool.query('SELECT * FROM users');
    for (const user of users.rows) {
      await targetPool.query(
        `INSERT INTO users (id, username, email, password_hash, full_name, is_active, created_at, updated_at, last_login_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [user.id, user.username, user.email, user.password_hash, user.full_name, 
         user.is_active, user.created_at, user.updated_at, user.last_login_at]
      );
    }
    console.log(`迁移了 ${users.rows.length} 个用户`);
    
    // 重置序列
    if (users.rows.length > 0) {
      const maxUserId = Math.max(...users.rows.map(u => u.id));
      await targetPool.query(`ALTER SEQUENCE users_id_seq RESTART WITH ${maxUserId + 1}`);
    }
    
    // 2. 迁移subscriptions表
    console.log('迁移subscriptions表...');
    const subscriptions = await sourcePool.query('SELECT * FROM subscriptions');
    for (const sub of subscriptions.rows) {
      await targetPool.query(
        `INSERT INTO subscriptions (id, name, description, provider, amount, currency, billing_cycle, 
         cycle_count, start_date, next_payment_date, reminder_days, category, active, 
         created_at, updated_at, user_id, cancelled_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [sub.id, sub.name, sub.description, sub.provider, sub.amount, sub.currency, 
         sub.billing_cycle, sub.cycle_count, sub.start_date, sub.next_payment_date, 
         sub.reminder_days, sub.category, sub.active, sub.created_at, sub.updated_at, 
         sub.user_id, sub.cancelled_at]
      );
    }
    console.log(`迁移了 ${subscriptions.rows.length} 个订阅`);
    
    // 重置序列
    if (subscriptions.rows.length > 0) {
      const maxSubId = Math.max(...subscriptions.rows.map(s => s.id));
      await targetPool.query(`ALTER SEQUENCE subscriptions_id_seq RESTART WITH ${maxSubId + 1}`);
    }
    
    // 3. 迁移reminders表
    console.log('迁移reminders表...');
    const reminders = await sourcePool.query('SELECT * FROM reminders');
    for (const reminder of reminders.rows) {
      await targetPool.query(
        `INSERT INTO reminders (id, subscription_id, reminder_date, sent)
         VALUES ($1, $2, $3, $4)`,
        [reminder.id, reminder.subscription_id, reminder.reminder_date, reminder.sent]
      );
    }
    console.log(`迁移了 ${reminders.rows.length} 个提醒`);
    
    // 重置序列
    if (reminders.rows.length > 0) {
      const maxReminderId = Math.max(...reminders.rows.map(r => r.id));
      await targetPool.query(`ALTER SEQUENCE reminders_id_seq RESTART WITH ${maxReminderId + 1}`);
    }
    
    // 4. 迁移notification_settings表
    console.log('迁移notification_settings表...');
    const notificationSettings = await sourcePool.query('SELECT * FROM notification_settings');
    for (const setting of notificationSettings.rows) {
      await targetPool.query(
        `INSERT INTO notification_settings (id, user_id, email, notify_days_before, 
         email_notifications, browser_notifications, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [setting.id, setting.user_id, setting.email, setting.notify_days_before,
         setting.email_notifications, setting.browser_notifications, 
         setting.created_at, setting.updated_at]
      );
    }
    console.log(`迁移了 ${notificationSettings.rows.length} 个通知设置`);
    
    // 重置序列
    if (notificationSettings.rows.length > 0) {
      const maxSettingId = Math.max(...notificationSettings.rows.map(s => s.id));
      await targetPool.query(`ALTER SEQUENCE notification_settings_id_seq RESTART WITH ${maxSettingId + 1}`);
    }
    
    // 5. 迁移subscription_history表
    console.log('迁移subscription_history表...');
    const subHistory = await sourcePool.query('SELECT * FROM subscription_history');
    for (const history of subHistory.rows) {
      await targetPool.query(
        `INSERT INTO subscription_history (id, subscription_id, user_id, change_type, 
         field_name, old_value, new_value, change_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [history.id, history.subscription_id, history.user_id, history.change_type,
         history.field_name, history.old_value, history.new_value, 
         history.change_date, history.notes]
      );
    }
    console.log(`迁移了 ${subHistory.rows.length} 条订阅历史`);
    
    // 重置序列
    if (subHistory.rows.length > 0) {
      const maxHistoryId = Math.max(...subHistory.rows.map(h => h.id));
      await targetPool.query(`ALTER SEQUENCE subscription_history_id_seq RESTART WITH ${maxHistoryId + 1}`);
    }
    
    // 6. 迁移payment_history表
    console.log('迁移payment_history表...');
    const paymentHistory = await sourcePool.query('SELECT * FROM payment_history');
    for (const payment of paymentHistory.rows) {
      await targetPool.query(
        `INSERT INTO payment_history (id, subscription_id, user_id, amount, currency, 
         payment_date, payment_method, status, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [payment.id, payment.subscription_id, payment.user_id, payment.amount, 
         payment.currency, payment.payment_date, payment.payment_method, 
         payment.status, payment.notes, payment.created_at]
      );
    }
    console.log(`迁移了 ${paymentHistory.rows.length} 条支付历史`);
    
    // 重置序列
    if (paymentHistory.rows.length > 0) {
      const maxPaymentId = Math.max(...paymentHistory.rows.map(p => p.id));
      await targetPool.query(`ALTER SEQUENCE payment_history_id_seq RESTART WITH ${maxPaymentId + 1}`);
    }
    
    // 7. 迁移budgets表
    console.log('迁移budgets表...');
    const budgets = await sourcePool.query('SELECT * FROM budgets');
    for (const budget of budgets.rows) {
      await targetPool.query(
        `INSERT INTO budgets (id, user_id, name, type, period, amount, currency, 
         category, warning_threshold, is_active, start_date, end_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [budget.id, budget.user_id, budget.name, budget.type, budget.period, 
         budget.amount, budget.currency, budget.category, budget.warning_threshold, 
         budget.is_active, budget.start_date, budget.end_date, 
         budget.created_at, budget.updated_at]
      );
    }
    console.log(`迁移了 ${budgets.rows.length} 个预算`);
    
    // 重置序列
    if (budgets.rows.length > 0) {
      const maxBudgetId = Math.max(...budgets.rows.map(b => b.id));
      await targetPool.query(`ALTER SEQUENCE budgets_id_seq RESTART WITH ${maxBudgetId + 1}`);
    }
    
    // 8. 迁移budget_history表
    console.log('迁移budget_history表...');
    const budgetHistory = await sourcePool.query('SELECT * FROM budget_history');
    for (const history of budgetHistory.rows) {
      await targetPool.query(
        `INSERT INTO budget_history (id, budget_id, user_id, period_start, period_end, 
         budget_amount, spent_amount, remaining_amount, usage_percentage, exceeded, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [history.id, history.budget_id, history.user_id, history.period_start, 
         history.period_end, history.budget_amount, history.spent_amount, 
         history.remaining_amount, history.usage_percentage, history.exceeded, 
         history.created_at]
      );
    }
    console.log(`迁移了 ${budgetHistory.rows.length} 条预算历史`);
    
    // 重置序列
    if (budgetHistory.rows.length > 0) {
      const maxHistoryId = Math.max(...budgetHistory.rows.map(h => h.id));
      await targetPool.query(`ALTER SEQUENCE budget_history_id_seq RESTART WITH ${maxHistoryId + 1}`);
    }
    
    // 9. 迁移budget_alerts表
    console.log('迁移budget_alerts表...');
    const budgetAlerts = await sourcePool.query('SELECT * FROM budget_alerts');
    for (const alert of budgetAlerts.rows) {
      await targetPool.query(
        `INSERT INTO budget_alerts (id, budget_id, user_id, alert_type, 
         usage_percentage, message, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [alert.id, alert.budget_id, alert.user_id, alert.alert_type, 
         alert.usage_percentage, alert.message, alert.is_read, alert.created_at]
      );
    }
    console.log(`迁移了 ${budgetAlerts.rows.length} 个预算警报`);
    
    // 重置序列
    if (budgetAlerts.rows.length > 0) {
      const maxAlertId = Math.max(...budgetAlerts.rows.map(a => a.id));
      await targetPool.query(`ALTER SEQUENCE budget_alerts_id_seq RESTART WITH ${maxAlertId + 1}`);
    }
    
    // 提交事务
    await targetPool.query('COMMIT');
    console.log('数据迁移成功完成！');
    
    // 验证数据
    console.log('\n数据验证...');
    const tables = ['users', 'subscriptions', 'reminders', 'notification_settings', 
                   'subscription_history', 'payment_history', 'budgets', 
                   'budget_history', 'budget_alerts'];
    
    for (const table of tables) {
      const sourceCount = await sourcePool.query(`SELECT COUNT(*) FROM ${table}`);
      const targetCount = await targetPool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`${table}: 源=${sourceCount.rows[0].count}, 目标=${targetCount.rows[0].count}`);
      
      if (sourceCount.rows[0].count !== targetCount.rows[0].count) {
        console.warn(`警告: ${table} 表的记录数不匹配！`);
      }
    }
    
  } catch (error) {
    await targetPool.query('ROLLBACK');
    console.error('迁移失败:', error);
    throw error;
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

// 执行迁移
migrateData().catch(console.error);