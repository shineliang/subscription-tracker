const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function updateAdminEmail(newEmail) {
  try {
    console.log('开始更新管理员邮箱...\n');
    
    if (!newEmail) {
      console.error('请提供新的邮箱地址作为参数');
      console.log('用法: node update-admin-email.js <新邮箱>');
      console.log('例如: node update-admin-email.js admin@yourdomain.com');
      return;
    }
    
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      console.error('邮箱格式无效');
      return;
    }
    
    // 更新管理员邮箱
    const { data, error } = await supabase
      .from('users')
      .update({ email: newEmail })
      .eq('username', 'admin')
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        console.error('❌ 邮箱已被其他用户使用');
      } else {
        console.error('❌ 更新失败:', error);
      }
    } else {
      console.log('✅ 管理员邮箱更新成功！');
      console.log('新邮箱:', data.email);
      console.log('\n请重新登录以使用新的邮箱地址。');
    }
    
  } catch (error) {
    console.error('发生错误:', error);
  }
}

// 从命令行参数获取新邮箱
const newEmail = process.argv[2];
updateAdminEmail(newEmail);