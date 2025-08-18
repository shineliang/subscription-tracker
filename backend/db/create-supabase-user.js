const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function createUser() {
  try {
    console.log('创建用户...\n');
    
    // 方法1: 使用 Supabase Auth 创建用户
    console.log('尝试使用 Supabase Auth 创建用户...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'admin@example.com',
      password: '777888',
      options: {
        data: {
          username: 'admin'
        }
      }
    });
    
    if (authError) {
      console.log('Auth 创建失败:', authError.message);
      
      // 如果用户已存在，尝试登录
      if (authError.message.includes('already registered')) {
        console.log('用户已存在，尝试登录...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: 'admin@example.com',
          password: '777888'
        });
        
        if (signInError) {
          console.error('登录失败:', signInError);
        } else {
          console.log('✅ 登录成功！');
          console.log('用户 ID:', signInData.user?.id);
        }
      }
    } else {
      console.log('✅ 用户创建成功！');
      console.log('用户信息:', authData.user);
    }
    
    // 方法2: 直接在自定义 users 表中创建记录
    console.log('\n同时在自定义 users 表中创建记录...');
    const hashedPassword = await bcrypt.hash('777888', 10);
    
    // 先尝试直接插入，不检查列
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert([{
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword
      }])
      .select();
    
    if (insertError) {
      console.log('自定义表插入失败:', insertError.message);
      
      // 如果失败，尝试只插入基本字段
      console.log('尝试简化插入...');
      const { data: simpleData, error: simpleError } = await supabase
        .from('users')
        .insert([{
          email: 'admin@example.com'
        }])
        .select();
      
      if (simpleError) {
        console.log('简化插入也失败:', simpleError.message);
        console.log('\n看起来 users 表结构需要在 Supabase Dashboard 中调整');
        console.log('请确保 users 表包含以下列：');
        console.log('- id (int/uuid, primary key)');
        console.log('- username (text)');
        console.log('- email (text)');
        console.log('- password (text)');
        console.log('- created_at (timestamp)');
      } else {
        console.log('✅ 基本信息插入成功');
      }
    } else {
      console.log('✅ 自定义表记录创建成功！');
      console.log('数据:', insertData);
    }
    
    console.log('\n========================================');
    console.log('登录信息：');
    console.log('用户名/邮箱: admin@example.com');
    console.log('密码: 777888');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('错误:', error);
  }
}

createUser();