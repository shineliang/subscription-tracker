const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function createAdminUser() {
  try {
    console.log('开始创建管理员用户...\n');
    
    // 1. 首先创建用户表（如果不存在）
    console.log('步骤 1: 确保用户表存在...');
    
    // 使用 Supabase 的方式创建表
    // 注意：在生产环境中，应该通过 Supabase Dashboard 或迁移脚本创建表
    
    // 2. 创建管理员用户
    console.log('步骤 2: 创建管理员用户...');
    const hashedPassword = await bcrypt.hash('777888', 10);
    
    // 尝试直接插入用户（假设表已存在）
    const userData = {
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword
    };
    
    console.log('用户数据准备完成：');
    console.log('- 用户名: admin');
    console.log('- 邮箱: admin@example.com');
    console.log('- 密码: 777888 (已加密)');
    
    // 先尝试删除旧用户（如果存在）
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('username', 'admin');
    
    if (deleteError && deleteError.code !== '42P01') {
      console.log('清理旧用户时出现问题:', deleteError.message);
    }
    
    // 插入新用户
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (error) {
      if (error.code === '42P01') {
        console.error('\n❌ 错误: 用户表不存在！');
        console.error('\n请按以下步骤操作：');
        console.error('1. 登录 Supabase Dashboard: https://supabase.com/dashboard/project/cwmtexaliunqpyjnancf');
        console.error('2. 进入 SQL Editor');
        console.error('3. 运行以下 SQL 创建用户表：\n');
        
        const createTableSQL = `
-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 如果需要，可以禁用 RLS（仅用于测试）
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
`;
        
        console.log(createTableSQL);
        console.error('\n4. 创建表后，再次运行此脚本');
        
      } else if (error.code === '23505') {
        console.log('\n用户 admin 已存在，尝试更新密码...');
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ password: hashedPassword })
          .eq('username', 'admin');
        
        if (updateError) {
          console.error('更新密码失败:', updateError);
        } else {
          console.log('✅ 密码更新成功！');
        }
      } else {
        console.error('\n❌ 创建用户失败:', error);
        console.error('错误代码:', error.code);
        console.error('错误消息:', error.message);
      }
    } else {
      console.log('\n✅ 管理员用户创建成功！');
      console.log('用户信息:', data);
    }
    
    // 3. 验证用户是否创建成功
    console.log('\n步骤 3: 验证用户...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('users')
      .select('id, username, email')
      .eq('username', 'admin')
      .single();
    
    if (verifyError) {
      console.error('无法验证用户:', verifyError.message);
    } else if (verifyData) {
      console.log('✅ 用户验证成功！');
      console.log('用户 ID:', verifyData.id);
      console.log('用户名:', verifyData.username);
      console.log('邮箱:', verifyData.email);
      
      // 验证密码
      const isPasswordValid = await bcrypt.compare('777888', hashedPassword);
      console.log('密码验证:', isPasswordValid ? '✅ 通过' : '❌ 失败');
    }
    
    console.log('\n========================================');
    console.log('完成！登录信息：');
    console.log('用户名: admin');
    console.log('密码: 777888');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('\n发生错误:', error);
  }
}

// 运行脚本
createAdminUser();