const { Client } = require('pg');

// PostgreSQL连接配置
const pgConfig = {
  host: '192.168.1.73',
  port: 5432,
  database: 'subscription_tracker',
  user: 'subscription_app',
  password: 'sub_app_2024'
};

async function cleanDatabase() {
  const client = new Client(pgConfig);
  
  try {
    console.log('连接到PostgreSQL数据库...');
    await client.connect();
    
    // 按照依赖关系的逆序删除数据
    const tables = [
      'budget_alerts',
      'budget_history',
      'budgets',
      'payment_history',
      'subscription_history',
      'notification_settings',
      'reminders',
      'subscriptions',
      'users',
      'migrations'
    ];
    
    console.log('清理所有表数据...');
    for (const table of tables) {
      await client.query(`TRUNCATE TABLE ${table} CASCADE`);
      console.log(`  清理了 ${table} 表`);
    }
    
    console.log('\n数据清理完成！');
    
  } catch (error) {
    console.error('清理数据时出错：', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// 执行清理
cleanDatabase();