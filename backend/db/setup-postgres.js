const { Client } = require('pg');

// PostgreSQL管理员连接配置
const adminConfig = {
  host: '192.168.1.73',
  port: 5432,
  user: 'postgres',
  password: 'post@098',
  database: 'postgres' // 连接到默认数据库
};

// 新数据库和用户配置
const DB_NAME = 'subscription_tracker';
const DB_USER = 'subscription_app';
const DB_PASSWORD = 'sub_app_2024';

async function setupDatabase() {
  const client = new Client(adminConfig);
  
  try {
    console.log('连接到PostgreSQL服务器...');
    await client.connect();
    
    // 检查数据库是否存在
    const dbCheck = await client.query(
      "SELECT datname FROM pg_database WHERE datname = $1",
      [DB_NAME]
    );
    
    if (dbCheck.rows.length === 0) {
      console.log(`创建数据库 ${DB_NAME}...`);
      await client.query(`CREATE DATABASE ${DB_NAME}`);
    } else {
      console.log(`数据库 ${DB_NAME} 已存在`);
    }
    
    // 检查用户是否存在
    const userCheck = await client.query(
      "SELECT usename FROM pg_user WHERE usename = $1",
      [DB_USER]
    );
    
    if (userCheck.rows.length === 0) {
      console.log(`创建用户 ${DB_USER}...`);
      await client.query(`CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}'`);
    } else {
      console.log(`用户 ${DB_USER} 已存在，更新密码...`);
      await client.query(`ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}'`);
    }
    
    // 授予权限
    console.log('授予数据库权限...');
    await client.query(`GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER}`);
    
    // 连接到新数据库并授予schema权限
    await client.end();
    
    const newDbConfig = {
      ...adminConfig,
      database: DB_NAME
    };
    
    const newClient = new Client(newDbConfig);
    await newClient.connect();
    
    console.log('授予schema权限...');
    await newClient.query(`GRANT ALL ON SCHEMA public TO ${DB_USER}`);
    await newClient.query(`GRANT CREATE ON SCHEMA public TO ${DB_USER}`);
    await newClient.end();
    
    console.log('数据库设置完成！');
    console.log('\n连接信息：');
    console.log(`Host: ${adminConfig.host}`);
    console.log(`Port: ${adminConfig.port}`);
    console.log(`Database: ${DB_NAME}`);
    console.log(`User: ${DB_USER}`);
    console.log(`Password: ${DB_PASSWORD}`);
    
  } catch (error) {
    console.error('设置数据库时出错：', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// 执行设置
setupDatabase();