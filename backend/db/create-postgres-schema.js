const { Client } = require('pg');

// 应用数据库连接配置
const dbConfig = {
  host: '192.168.1.73',
  port: 5432,
  database: 'subscription_tracker',
  user: 'subscription_app',
  password: 'sub_app_2024'
};

async function createSchema() {
  const client = new Client(dbConfig);
  
  try {
    console.log('连接到subscription_tracker数据库...');
    await client.connect();
    
    // 开始事务
    await client.query('BEGIN');
    
    // 1. 创建 users 表
    console.log('创建 users 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP WITH TIME ZONE
      )
    `);
    
    // users 表索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    
    // 2. 创建 subscriptions 表
    console.log('创建 subscriptions 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        provider VARCHAR(255),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
        billing_cycle VARCHAR(50) NOT NULL,
        cycle_count INTEGER DEFAULT 1,
        start_date DATE NOT NULL,
        next_payment_date DATE NOT NULL,
        reminder_days INTEGER DEFAULT 7,
        category VARCHAR(100),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER REFERENCES users(id),
        cancelled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
      )
    `);
    
    // subscriptions 表索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)');
    
    // 3. 创建 reminders 表
    console.log('创建 reminders 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id SERIAL PRIMARY KEY,
        subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        reminder_date DATE NOT NULL,
        sent BOOLEAN DEFAULT false
      )
    `);
    
    // 4. 创建 notification_settings 表
    console.log('创建 notification_settings 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255),
        notify_days_before INTEGER DEFAULT 7,
        email_notifications BOOLEAN DEFAULT true,
        browser_notifications BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);
    
    // notification_settings 表索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id)');
    
    // 5. 创建 subscription_history 表
    console.log('创建 subscription_history 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_history (
        id SERIAL PRIMARY KEY,
        subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('created', 'updated', 'cancelled', 'reactivated')),
        field_name VARCHAR(100),
        old_value TEXT,
        new_value TEXT,
        change_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
      )
    `);
    
    // subscription_history 表索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription_id ON subscription_history(subscription_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id)');
    
    // 6. 创建 payment_history 表
    console.log('创建 payment_history 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_history (
        id SERIAL PRIMARY KEY,
        subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'CNY',
        payment_date DATE NOT NULL,
        payment_method VARCHAR(50),
        status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // payment_history 表索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_payment_history_subscription_id ON payment_history(subscription_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_payment_history_payment_date ON payment_history(payment_date)');
    
    // 7. 创建 budgets 表
    console.log('创建 budgets 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK(type IN ('total', 'category')),
        period VARCHAR(20) NOT NULL CHECK(period IN ('monthly', 'yearly')),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'CNY',
        category VARCHAR(100),
        warning_threshold INTEGER DEFAULT 80,
        is_active BOOLEAN DEFAULT true,
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, type, period, category)
      )
    `);
    
    // budgets 表索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category)');
    
    // 8. 创建 budget_history 表
    console.log('创建 budget_history 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS budget_history (
        id SERIAL PRIMARY KEY,
        budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        budget_amount DECIMAL(10,2) NOT NULL,
        spent_amount DECIMAL(10,2) DEFAULT 0,
        remaining_amount DECIMAL(10,2),
        usage_percentage DECIMAL(5,2),
        exceeded BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // budget_history 表索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_budget_history_budget_id ON budget_history(budget_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_budget_history_period ON budget_history(period_start, period_end)');
    
    // 9. 创建 budget_alerts 表
    console.log('创建 budget_alerts 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS budget_alerts (
        id SERIAL PRIMARY KEY,
        budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        alert_type VARCHAR(20) NOT NULL CHECK(alert_type IN ('warning', 'exceeded')),
        usage_percentage DECIMAL(5,2) NOT NULL,
        message TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // budget_alerts 表索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_budget_alerts_user_id ON budget_alerts(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_budget_alerts_is_read ON budget_alerts(is_read)');
    
    // 10. 创建 migrations 表
    console.log('创建 migrations 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建更新 updated_at 的触发器函数
    console.log('创建 updated_at 触发器...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    // 为需要 updated_at 的表创建触发器
    const tablesWithUpdatedAt = ['users', 'subscriptions', 'notification_settings', 'budgets'];
    for (const table of tablesWithUpdatedAt) {
      await client.query(`
        CREATE TRIGGER update_${table}_updated_at BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
    }
    
    // 提交事务
    await client.query('COMMIT');
    console.log('所有表创建成功！');
    
  } catch (error) {
    // 回滚事务
    await client.query('ROLLBACK');
    console.error('创建表结构时出错：', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// 执行创建表结构
createSchema();