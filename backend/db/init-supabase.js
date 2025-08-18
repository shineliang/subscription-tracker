const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function initDatabase() {
  console.log('开始初始化 Supabase 数据库...\n');
  
  try {
    // 1. 创建管理员用户
    console.log('1. 创建管理员用户...');
    const hashedPassword = await bcrypt.hash('777888', 10);
    
    // 先检查用户是否存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', 'admin')
      .single();
    
    if (existingUser) {
      console.log('   管理员用户已存在，更新密码...');
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          password: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('username', 'admin');
      
      if (updateError) {
        console.error('   更新密码失败:', updateError.message);
      } else {
        console.log('   ✅ 管理员密码已更新');
      }
    } else {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          username: 'admin',
          email: 'admin@example.com',
          password: hashedPassword
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('   创建用户失败:', insertError.message);
      } else {
        console.log('   ✅ 管理员用户创建成功');
      }
    }
    
    // 2. 创建示例订阅数据（可选）
    console.log('\n2. 检查示例数据...');
    
    // 获取管理员用户 ID
    const { data: adminUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', 'admin')
      .single();
    
    if (adminUser) {
      // 检查是否已有订阅数据
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', adminUser.id);
      
      if (subError && subError.code === '42P01') {
        console.log('   订阅表不存在，请先在 Supabase 仪表板中运行 schema.sql');
      } else if (!subscriptions || subscriptions.length === 0) {
        console.log('   创建示例订阅数据...');
        
        const sampleSubscriptions = [
          {
            user_id: adminUser.id,
            name: 'Netflix',
            description: '视频流媒体服务',
            url: 'https://netflix.com',
            price: 25,
            currency: 'CNY',
            billing_cycle: 'monthly',
            billing_date: new Date().toISOString().split('T')[0],
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            category: '娱乐',
            status: 'active',
            reminder_days: 3
          },
          {
            user_id: adminUser.id,
            name: 'Spotify',
            description: '音乐流媒体服务',
            url: 'https://spotify.com',
            price: 10,
            currency: 'CNY',
            billing_cycle: 'monthly',
            billing_date: new Date().toISOString().split('T')[0],
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            category: '娱乐',
            status: 'active',
            reminder_days: 3
          },
          {
            user_id: adminUser.id,
            name: 'GitHub Pro',
            description: '代码托管平台专业版',
            url: 'https://github.com',
            price: 4,
            currency: 'USD',
            billing_cycle: 'monthly',
            billing_date: new Date().toISOString().split('T')[0],
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            category: '开发工具',
            status: 'active',
            reminder_days: 7
          }
        ];
        
        const { error: insertSubError } = await supabase
          .from('subscriptions')
          .insert(sampleSubscriptions);
        
        if (insertSubError) {
          console.error('   创建示例订阅失败:', insertSubError.message);
        } else {
          console.log('   ✅ 示例订阅数据创建成功');
        }
      } else {
        console.log('   ✅ 已有订阅数据');
      }
      
      // 创建默认预算
      const { data: budget } = await supabase
        .from('budgets')
        .select('id')
        .eq('user_id', adminUser.id)
        .single();
      
      if (!budget) {
        const { error: budgetError } = await supabase
          .from('budgets')
          .insert({
            user_id: adminUser.id,
            monthly_limit: 500,
            alert_threshold: 80
          });
        
        if (budgetError && budgetError.code !== '42P01') {
          console.error('   创建预算失败:', budgetError.message);
        } else if (!budgetError) {
          console.log('   ✅ 默认预算创建成功');
        }
      }
      
      // 创建默认通知设置
      const { data: notificationSettings } = await supabase
        .from('notification_settings')
        .select('id')
        .eq('user_id', adminUser.id)
        .single();
      
      if (!notificationSettings) {
        const { error: notifError } = await supabase
          .from('notification_settings')
          .insert({
            user_id: adminUser.id,
            email_enabled: true,
            browser_enabled: true,
            reminder_time: '09:00:00',
            reminder_days_before: 3
          });
        
        if (notifError && notifError.code !== '42P01') {
          console.error('   创建通知设置失败:', notifError.message);
        } else if (!notifError) {
          console.log('   ✅ 默认通知设置创建成功');
        }
      }
    }
    
    console.log('\n========================================');
    console.log('数据库初始化完成！');
    console.log('========================================');
    console.log('\n登录信息：');
    console.log('用户名: admin');
    console.log('密码: 777888');
    console.log('\n如果某些表不存在，请先在 Supabase 仪表板中运行 supabase-schema.sql');
    
  } catch (error) {
    console.error('\n初始化失败:', error);
    console.error('\n请确保：');
    console.error('1. 在 Supabase 仪表板中运行了 supabase-schema.sql');
    console.error('2. .env 文件中配置了正确的 SUPABASE_URL 和 SUPABASE_ANON_KEY');
  }
}

// 运行初始化
initDatabase();