-- Supabase 数据库表结构初始化脚本
-- 在 Supabase SQL Editor 中运行此脚本

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建订阅表
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  url VARCHAR(500),
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'CNY',
  billing_cycle VARCHAR(50) NOT NULL, -- daily, weekly, monthly, quarterly, yearly
  billing_date DATE,
  next_billing_date DATE,
  category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active', -- active, cancelled, paused
  reminder_days INTEGER DEFAULT 3,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建预算表
CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  monthly_limit DECIMAL(10, 2) NOT NULL,
  alert_threshold INTEGER DEFAULT 80, -- 百分比
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建支付历史表
CREATE TABLE IF NOT EXISTS payment_history (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建提醒表
CREATE TABLE IF NOT EXISTS reminders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建通知设置表
CREATE TABLE IF NOT EXISTS notification_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT TRUE,
  browser_enabled BOOLEAN DEFAULT TRUE,
  reminder_time TIME DEFAULT '09:00:00',
  reminder_days_before INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date ON subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription_id ON payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_reminder_date ON reminders(reminder_date);

-- 创建更新时间戳的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 为需要的表添加更新时间戳触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 启用 Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略（允许用户访问自己的数据）
-- 注意：在生产环境中，应该使用更严格的策略
CREATE POLICY "Users can view own data" ON users
  FOR ALL USING (true);

CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR ALL USING (true);

CREATE POLICY "Users can view own budgets" ON budgets
  FOR ALL USING (true);

CREATE POLICY "Users can view own payment history" ON payment_history
  FOR ALL USING (true);

CREATE POLICY "Users can view own reminders" ON reminders
  FOR ALL USING (true);

CREATE POLICY "Users can view own notification settings" ON notification_settings
  FOR ALL USING (true);

-- 插入默认的管理员用户（密码：777888，使用 bcrypt 加密）
-- 注意：这个密码哈希是使用 bcryptjs 生成的
INSERT INTO users (username, email, password)
VALUES ('admin', 'admin@example.com', '$2a$10$YourHashedPasswordHere')
ON CONFLICT (username) DO NOTHING;

-- 提示信息
DO $$
BEGIN
  RAISE NOTICE '数据库表结构创建成功！';
  RAISE NOTICE '请记得：';
  RAISE NOTICE '1. 在生产环境中更新 RLS 策略';
  RAISE NOTICE '2. 更新管理员密码哈希值';
  RAISE NOTICE '3. 配置正确的环境变量';
END $$;