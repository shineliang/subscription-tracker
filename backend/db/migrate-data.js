const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const path = require('path');

// SQLite数据库路径
const SQLITE_DB_PATH = path.join(__dirname, 'subscription_tracker.db');

// PostgreSQL连接配置
const pgConfig = {
  host: '192.168.1.73',
  port: 5432,
  database: 'subscription_tracker',
  user: 'subscription_app',
  password: 'sub_app_2024'
};

// 转换SQLite布尔值到PostgreSQL布尔值
function convertBoolean(value) {
  return value === 1 || value === '1' || value === true;
}

// 转换日期格式
function convertDate(value) {
  if (!value) return null;
  // 如果是时间戳格式，直接返回
  if (value.includes(':')) return value;
  // 如果是日期格式，添加时间部分
  return `${value} 00:00:00`;
}

async function migrateData() {
  // 连接到SQLite数据库
  const sqliteDb = new sqlite3.Database(SQLITE_DB_PATH);
  
  // 连接到PostgreSQL数据库
  const pgClient = new Client(pgConfig);
  await pgClient.connect();
  
  try {
    console.log('开始数据迁移...\n');
    
    // 开始事务
    await pgClient.query('BEGIN');
    
    // 1. 迁移 users 表
    console.log('迁移 users 表...');
    const users = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM users', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    for (const user of users) {
      await pgClient.query(`
        INSERT INTO users (id, username, email, password_hash, full_name, is_active, created_at, updated_at, last_login_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `, [
        user.id,
        user.username,
        user.email,
        user.password_hash,
        user.full_name,
        convertBoolean(user.is_active),
        convertDate(user.created_at),
        convertDate(user.updated_at),
        convertDate(user.last_login_at)
      ]);
    }
    console.log(`  迁移了 ${users.length} 个用户`);
    
    // 重置序列
    await pgClient.query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))`);
    
    // 2. 迁移 subscriptions 表
    console.log('\n迁移 subscriptions 表...');
    const subscriptions = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM subscriptions', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    for (const sub of subscriptions) {
      await pgClient.query(`
        INSERT INTO subscriptions (
          id, name, description, provider, amount, currency, billing_cycle, 
          cycle_count, start_date, next_payment_date, reminder_days, category, 
          active, created_at, updated_at, user_id, cancelled_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO NOTHING
      `, [
        sub.id,
        sub.name,
        sub.description,
        sub.provider,
        sub.amount,
        sub.currency,
        sub.billing_cycle,
        sub.cycle_count,
        sub.start_date,
        sub.next_payment_date,
        sub.reminder_days,
        sub.category,
        convertBoolean(sub.active),
        convertDate(sub.created_at),
        convertDate(sub.updated_at),
        sub.user_id,
        convertDate(sub.cancelled_at)
      ]);
    }
    console.log(`  迁移了 ${subscriptions.length} 个订阅`);
    
    // 重置序列
    await pgClient.query(`SELECT setval('subscriptions_id_seq', (SELECT MAX(id) FROM subscriptions))`);
    
    // 3. 迁移 reminders 表
    console.log('\n迁移 reminders 表...');
    const reminders = await new Promise((resolve, reject) => {
      sqliteDb.all(`
        SELECT r.* FROM reminders r
        INNER JOIN subscriptions s ON r.subscription_id = s.id
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    let reminderCount = 0;
    for (const reminder of reminders) {
      try {
        await pgClient.query(`
          INSERT INTO reminders (id, subscription_id, reminder_date, sent)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO NOTHING
        `, [
          reminder.id,
          reminder.subscription_id,
          reminder.reminder_date,
          convertBoolean(reminder.sent)
        ]);
        reminderCount++;
      } catch (err) {
        console.log(`  跳过无效的reminder记录 (id=${reminder.id}): ${err.message}`);
      }
    }
    console.log(`  迁移了 ${reminderCount} 个提醒`);
    
    // 重置序列
    if (reminders.length > 0) {
      await pgClient.query(`SELECT setval('reminders_id_seq', (SELECT MAX(id) FROM reminders))`);
    }
    
    // 4. 迁移 notification_settings 表
    console.log('\n迁移 notification_settings 表...');
    const notificationSettings = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM notification_settings', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    for (const setting of notificationSettings) {
      await pgClient.query(`
        INSERT INTO notification_settings (
          id, user_id, email, notify_days_before, email_notifications, 
          browser_notifications, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, [
        setting.id,
        setting.user_id,
        setting.email,
        setting.notify_days_before,
        convertBoolean(setting.email_notifications),
        convertBoolean(setting.browser_notifications),
        convertDate(setting.created_at),
        convertDate(setting.updated_at)
      ]);
    }
    console.log(`  迁移了 ${notificationSettings.length} 个通知设置`);
    
    // 重置序列
    if (notificationSettings.length > 0) {
      await pgClient.query(`SELECT setval('notification_settings_id_seq', (SELECT MAX(id) FROM notification_settings))`);
    }
    
    // 5. 迁移 subscription_history 表
    console.log('\n迁移 subscription_history 表...');
    const subscriptionHistory = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM subscription_history', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    for (const history of subscriptionHistory) {
      await pgClient.query(`
        INSERT INTO subscription_history (
          id, subscription_id, user_id, change_type, field_name, 
          old_value, new_value, change_date, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `, [
        history.id,
        history.subscription_id,
        history.user_id,
        history.change_type,
        history.field_name,
        history.old_value,
        history.new_value,
        convertDate(history.change_date),
        history.notes
      ]);
    }
    console.log(`  迁移了 ${subscriptionHistory.length} 条历史记录`);
    
    // 重置序列
    if (subscriptionHistory.length > 0) {
      await pgClient.query(`SELECT setval('subscription_history_id_seq', (SELECT MAX(id) FROM subscription_history))`);
    }
    
    // 6. 迁移 payment_history 表
    console.log('\n迁移 payment_history 表...');
    const paymentHistory = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM payment_history', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    for (const payment of paymentHistory) {
      await pgClient.query(`
        INSERT INTO payment_history (
          id, subscription_id, user_id, amount, currency, payment_date, 
          payment_method, status, notes, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING
      `, [
        payment.id,
        payment.subscription_id,
        payment.user_id,
        payment.amount,
        payment.currency,
        payment.payment_date,
        payment.payment_method,
        payment.status,
        payment.notes,
        convertDate(payment.created_at)
      ]);
    }
    console.log(`  迁移了 ${paymentHistory.length} 条付款记录`);
    
    // 重置序列
    if (paymentHistory.length > 0) {
      await pgClient.query(`SELECT setval('payment_history_id_seq', (SELECT MAX(id) FROM payment_history))`);
    }
    
    // 7. 迁移 budgets 表
    console.log('\n迁移 budgets 表...');
    const budgets = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM budgets', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    for (const budget of budgets) {
      await pgClient.query(`
        INSERT INTO budgets (
          id, user_id, name, type, period, amount, currency, category, 
          warning_threshold, is_active, start_date, end_date, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO NOTHING
      `, [
        budget.id,
        budget.user_id,
        budget.name,
        budget.type,
        budget.period,
        budget.amount,
        budget.currency,
        budget.category,
        budget.warning_threshold,
        convertBoolean(budget.is_active),
        budget.start_date,
        budget.end_date,
        convertDate(budget.created_at),
        convertDate(budget.updated_at)
      ]);
    }
    console.log(`  迁移了 ${budgets.length} 个预算`);
    
    // 重置序列
    if (budgets.length > 0) {
      await pgClient.query(`SELECT setval('budgets_id_seq', (SELECT MAX(id) FROM budgets))`);
    }
    
    // 8. 迁移 budget_history 表
    console.log('\n迁移 budget_history 表...');
    const budgetHistory = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM budget_history', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    for (const history of budgetHistory) {
      await pgClient.query(`
        INSERT INTO budget_history (
          id, budget_id, user_id, period_start, period_end, budget_amount, 
          spent_amount, remaining_amount, usage_percentage, exceeded, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `, [
        history.id,
        history.budget_id,
        history.user_id,
        history.period_start,
        history.period_end,
        history.budget_amount,
        history.spent_amount,
        history.remaining_amount,
        history.usage_percentage,
        convertBoolean(history.exceeded),
        convertDate(history.created_at)
      ]);
    }
    console.log(`  迁移了 ${budgetHistory.length} 条预算历史`);
    
    // 重置序列
    if (budgetHistory.length > 0) {
      await pgClient.query(`SELECT setval('budget_history_id_seq', (SELECT MAX(id) FROM budget_history))`);
    }
    
    // 9. 迁移 budget_alerts 表
    console.log('\n迁移 budget_alerts 表...');
    const budgetAlerts = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM budget_alerts', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    for (const alert of budgetAlerts) {
      await pgClient.query(`
        INSERT INTO budget_alerts (
          id, budget_id, user_id, alert_type, usage_percentage, 
          message, is_read, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, [
        alert.id,
        alert.budget_id,
        alert.user_id,
        alert.alert_type,
        alert.usage_percentage,
        alert.message,
        convertBoolean(alert.is_read),
        convertDate(alert.created_at)
      ]);
    }
    console.log(`  迁移了 ${budgetAlerts.length} 条预算警告`);
    
    // 重置序列
    if (budgetAlerts.length > 0) {
      await pgClient.query(`SELECT setval('budget_alerts_id_seq', (SELECT MAX(id) FROM budget_alerts))`);
    }
    
    // 10. 迁移 migrations 表
    console.log('\n迁移 migrations 表...');
    const migrations = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM migrations', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    for (const migration of migrations) {
      await pgClient.query(`
        INSERT INTO migrations (id, name, executed_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO NOTHING
      `, [
        migration.id,
        migration.name,
        convertDate(migration.executed_at)
      ]);
    }
    console.log(`  迁移了 ${migrations.length} 条迁移记录`);
    
    // 重置序列
    if (migrations.length > 0) {
      await pgClient.query(`SELECT setval('migrations_id_seq', (SELECT MAX(id) FROM migrations))`);
    }
    
    // 提交事务
    await pgClient.query('COMMIT');
    console.log('\n数据迁移完成！');
    
  } catch (error) {
    // 回滚事务
    await pgClient.query('ROLLBACK');
    console.error('数据迁移出错：', error);
    process.exit(1);
  } finally {
    // 关闭连接
    sqliteDb.close();
    await pgClient.end();
  }
}

// 执行数据迁移
migrateData();