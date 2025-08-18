const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 从截图中提取的订阅数据
const subscriptions = [
  // 活跃订阅
  {
    name: '腾讯视频VIP',
    description: '腾讯视频会员服务，34部题库，微信',
    price: 32.00,
    currency: 'CNY',
    billing_cycle: 'monthly',
    category: '娱乐',
    status: 'active',
    next_billing_date: '2025-08-01',
    reminder_days: 3
  },
  {
    name: 'Claude Max',
    provider: 'Anthropic',
    description: '台币',
    price: 784.00,
    currency: 'TWD',
    billing_cycle: 'monthly',
    category: '技术',
    status: 'active',
    next_billing_date: '2025-08-11',
    reminder_days: 3
  },
  {
    name: 'Gamma Pro',
    price: 49.98,
    currency: 'USD',
    billing_cycle: 'monthly',
    category: '办公',
    status: 'active',
    next_billing_date: '2025-08-12',
    reminder_days: 3
  },
  {
    name: 'superwhisper',
    price: 40.00,
    currency: 'USD',
    billing_cycle: 'monthly',
    category: '工具',
    status: 'active',
    next_billing_date: '2025-08-16',
    reminder_days: 3
  },
  {
    name: 'Cursor',
    price: 145.00,
    currency: 'CNY',
    billing_cycle: 'monthly',
    category: '开发',
    status: 'active',
    next_billing_date: '2025-08-16',
    reminder_days: 3
  },
  {
    name: '美国家庭苹果iP',
    price: 68.00,
    currency: 'CNY',
    billing_cycle: 'monthly',
    category: '订阅服务',
    status: 'active',
    next_billing_date: '2025-08-18',
    reminder_days: 3
  },
  {
    name: 'Youtube',
    price: 60.00,
    currency: 'CNY',
    billing_cycle: 'monthly',
    category: '娱乐',
    status: 'active',
    next_billing_date: '2025-08-24',
    reminder_days: 3
  },
  {
    name: '车位',
    price: 1500.00,
    currency: 'CNY',
    billing_cycle: 'yearly',
    category: '生活',
    status: 'active',
    next_billing_date: '2025-09-03',
    reminder_days: 7
  },
  {
    name: 'Nextdaily 美即IP',
    price: 45.00,
    currency: 'CNY',
    billing_cycle: 'monthly',
    category: '工具',
    status: 'active',
    next_billing_date: '2025-10-15',
    reminder_days: 3
  },
  {
    name: 'Monica',
    price: 875.00,
    currency: 'CNY',
    billing_cycle: 'yearly',
    category: '工具',
    status: 'active',
    next_billing_date: '2026-01-11',
    reminder_days: 7
  },
  {
    name: 'Lenny Newsletter',
    description: '每一周快讯',
    price: 750.00,
    currency: 'CNY',
    billing_cycle: 'yearly',
    category: '学习',
    status: 'active',
    next_billing_date: '2026-04-17',
    reminder_days: 7
  },
  {
    name: 'Nextdaily',
    price: 625.00,
    currency: 'CNY',
    billing_cycle: 'yearly',
    category: '工具',
    status: 'active',
    next_billing_date: '2026-04-19',
    reminder_days: 7
  },
  {
    name: 'Office 365',
    provider: 'Microsoft',
    price: 35.00,
    currency: 'CNY',
    billing_cycle: 'monthly',
    category: '办公',
    status: 'active',
    next_billing_date: '2026-04-30',
    reminder_days: 3
  },
  {
    name: 'Apple One',
    provider: 'Apple',
    price: 100.00,
    currency: 'CNY',
    billing_cycle: 'monthly',
    category: '订阅服务',
    status: 'active',
    next_billing_date: '2026-04-30',
    reminder_days: 3
  },
  {
    name: 'Raycast',
    price: 700.00,
    currency: 'CNY',
    billing_cycle: 'yearly',
    category: '工具',
    status: 'active',
    next_billing_date: '2026-05-13',
    reminder_days: 7
  },
  {
    name: 'ChatGPT学校账号',
    provider: 'OpenAI',
    price: 480.00,
    currency: 'CNY',
    billing_cycle: 'yearly',
    category: '技术',
    status: 'active',
    next_billing_date: '2026-07-11',
    reminder_days: 7
  },
  {
    name: '美国独立服务器',
    price: 225.00,
    currency: 'CNY',
    billing_cycle: 'monthly',
    category: '技术',
    status: 'active',
    next_billing_date: '2026-07-16',
    reminder_days: 3
  },
  
  // 已取消订阅
  {
    name: 'Claude',
    provider: 'Anthropic',
    description: 'AI Assistant',
    price: 150.00,
    currency: 'CNY',
    billing_cycle: 'monthly',
    category: '技术',
    status: 'cancelled',
    next_billing_date: '2025-06-15',
    reminder_days: 3,
    notes: '订阅被腾讯家庭取消'
  },
  {
    name: 'Claude Max',
    provider: 'Anthropic',
    description: '与人合租，6.2开始，也加验券被官限制',
    price: 784.00,
    currency: 'CNY',
    billing_cycle: 'monthly',
    category: '技术',
    status: 'cancelled',
    next_billing_date: '2025-07-11',
    reminder_days: 3,
    notes: '订阅被腾讯家庭取消'
  },
  {
    name: 'Windsurf',
    price: 55.00,
    currency: 'CNY',
    billing_cycle: 'monthly',
    category: '开发',
    status: 'cancelled',
    next_billing_date: '2025-07-23',
    reminder_days: 3,
    notes: '订阅被腾讯家庭取消'
  },
  {
    name: 'ChatGPT',
    provider: 'Open AI',
    price: 140.00,
    currency: 'CNY',
    billing_cycle: 'monthly',
    category: '技术',
    status: 'cancelled',
    next_billing_date: '2025-07-26',
    reminder_days: 3,
    notes: '订阅被腾讯家庭取消'
  }
];

async function importSubscriptions() {
  try {
    console.log('开始导入订阅数据...\n');
    
    // 1. 获取admin用户的ID
    console.log('步骤 1: 获取管理员用户信息...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', 'admin')
      .single();
    
    if (userError || !userData) {
      console.error('❌ 获取用户信息失败:', userError);
      return;
    }
    
    const userId = userData.id;
    console.log('✅ 找到管理员用户，ID:', userId);
    
    // 2. 准备订阅数据
    console.log('\n步骤 2: 准备订阅数据...');
    const subscriptionsToInsert = subscriptions.map(sub => {
      // 计算开始日期（假设从今天往前推一个周期）
      const today = new Date();
      let startDate = new Date(sub.next_billing_date);
      
      if (sub.billing_cycle === 'monthly') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (sub.billing_cycle === 'yearly') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }
      
      return {
        user_id: userId,
        name: sub.name,
        description: sub.description || null,
        provider: sub.provider || null,
        amount: sub.price,
        currency: sub.currency,
        billing_cycle: sub.billing_cycle,
        cycle_count: 1, // 默认为1个周期
        start_date: startDate.toISOString().split('T')[0],
        next_payment_date: sub.next_billing_date,
        reminder_days: sub.reminder_days,
        category: sub.category,
        active: sub.status === 'active',
        cancelled_at: sub.status === 'cancelled' ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    console.log(`准备导入 ${subscriptionsToInsert.length} 个订阅`);
    
    // 3. 批量插入订阅
    console.log('\n步骤 3: 插入订阅数据...');
    const { data: insertedData, error: insertError } = await supabase
      .from('subscriptions')
      .insert(subscriptionsToInsert)
      .select();
    
    if (insertError) {
      console.error('❌ 插入订阅失败:', insertError);
      return;
    }
    
    console.log(`✅ 成功导入 ${insertedData.length} 个订阅！`);
    
    // 4. 统计信息
    console.log('\n步骤 4: 统计信息');
    const activeCount = subscriptions.filter(s => s.status === 'active').length;
    const cancelledCount = subscriptions.filter(s => s.status === 'cancelled').length;
    
    console.log('----------------------------------------');
    console.log('导入统计:');
    console.log(`- 活跃订阅: ${activeCount} 个`);
    console.log(`- 已取消订阅: ${cancelledCount} 个`);
    console.log(`- 总计: ${subscriptions.length} 个`);
    console.log('----------------------------------------');
    
    // 5. 计算月度支出
    const monthlyTotal = subscriptions
      .filter(s => s.status === 'active')
      .reduce((total, sub) => {
        let monthlyAmount = 0;
        if (sub.billing_cycle === 'monthly') {
          monthlyAmount = sub.price;
        } else if (sub.billing_cycle === 'yearly') {
          monthlyAmount = sub.price / 12;
        }
        
        // 转换为人民币（简单汇率转换）
        if (sub.currency === 'USD') {
          monthlyAmount *= 7.2;
        } else if (sub.currency === 'TWD') {
          monthlyAmount *= 0.23;
        }
        
        return total + monthlyAmount;
      }, 0);
    
    console.log(`\n预计月度支出: ¥${monthlyTotal.toFixed(2)}`);
    console.log('\n✅ 所有订阅数据导入完成！');
    
  } catch (error) {
    console.error('\n发生错误:', error);
  }
}

// 运行导入脚本
importSubscriptions();