const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { generateToken, authenticateToken, refreshToken } = require('../middleware/auth');
const { validateEmail } = require('../middleware/validation');

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, full_name } = req.body;
    
    // 验证输入
    if (!username || !email || !password) {
      return res.status(400).json({ error: '用户名、邮箱和密码为必填项' });
    }
    
    // 验证用户名格式（3-20个字符，字母数字下划线）
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ error: '用户名必须为3-20个字符，只能包含字母、数字和下划线' });
    }
    
    // 验证邮箱格式
    if (!validateEmail(email)) {
      return res.status(400).json({ error: '邮箱格式无效' });
    }
    
    // 验证密码强度（至少6个字符）
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少为6个字符' });
    }
    
    // 创建用户
    User.create({ username, email, password, full_name }, (err, user) => {
      if (err) {
        if (err.message.includes('已存在')) {
          return res.status(409).json({ error: err.message });
        }
        console.error('注册失败:', err);
        return res.status(500).json({ error: '注册失败，请稍后再试' });
      }
      
      // 生成令牌
      const token = generateToken(user);
      
      // 更新最后登录时间
      User.updateLastLogin(user.id, (updateErr) => {
        if (updateErr) {
          console.error('更新登录时间失败:', updateErr);
        }
      });
      
      res.status(201).json({
        message: '注册成功',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name
        }
      });
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '请提供用户名和密码' });
    }
    
    // 根据输入判断是用户名还是邮箱
    const isEmail = username.includes('@');
    const getUserMethod = isEmail ? User.getByEmail : User.getByUsername;
    
    getUserMethod(username, async (err, user) => {
      if (err) {
        console.error('查询用户失败:', err);
        return res.status(500).json({ error: '登录失败' });
      }
      
      if (!user) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }
      
      if (!user.is_active) {
        return res.status(403).json({ error: '账号已被禁用' });
      }
      
      // 验证密码
      const isValidPassword = await User.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }
      
      // 生成令牌
      const token = generateToken(user);
      
      // 更新最后登录时间
      User.updateLastLogin(user.id, (updateErr) => {
        if (updateErr) {
          console.error('更新登录时间失败:', updateErr);
        }
      });
      
      res.json({
        message: '登录成功',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name
        }
      });
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 刷新令牌
router.post('/refresh', refreshToken);

// 获取当前用户信息
router.get('/me', authenticateToken, (req, res) => {
  const user = req.user;
  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    full_name: user.full_name,
    created_at: user.created_at,
    last_login_at: user.last_login_at
  });
});

// 更新当前用户信息
router.put('/me', authenticateToken, (req, res) => {
  const { email, full_name } = req.body;
  const userId = req.user.id;
  
  // 验证邮箱格式
  if (email && !validateEmail(email)) {
    return res.status(400).json({ error: '邮箱格式无效' });
  }
  
  User.update(userId, { email, full_name }, (err, user) => {
    if (err) {
      if (err.message.includes('已存在')) {
        return res.status(409).json({ error: '邮箱已被使用' });
      }
      console.error('更新用户信息失败:', err);
      return res.status(500).json({ error: '更新失败' });
    }
    
    res.json({
      message: '更新成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name
      }
    });
  });
});

// 修改密码
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;
    
    if (!current_password || !new_password) {
      return res.status(400).json({ error: '请提供当前密码和新密码' });
    }
    
    if (new_password.length < 6) {
      return res.status(400).json({ error: '新密码长度至少为6个字符' });
    }
    
    // 获取用户完整信息（包含密码哈希）
    User.getById(userId, async (err, user) => {
      if (err || !user) {
        return res.status(500).json({ error: '获取用户信息失败' });
      }
      
      // 由于getById不返回密码，需要重新获取
      User.getByUsername(req.user.username, async (err2, userWithPassword) => {
        if (err2 || !userWithPassword) {
          return res.status(500).json({ error: '获取用户信息失败' });
        }
        
        // 验证当前密码
        const isValidPassword = await User.verifyPassword(current_password, userWithPassword.password_hash);
        if (!isValidPassword) {
          return res.status(401).json({ error: '当前密码错误' });
        }
        
        // 更新密码
        User.updatePassword(userId, new_password, (updateErr, result) => {
          if (updateErr) {
            console.error('更新密码失败:', updateErr);
            return res.status(500).json({ error: '更新密码失败' });
          }
          
          res.json({ message: '密码修改成功' });
        });
      });
    });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 登出（客户端清除令牌即可，这里可以记录登出事件）
router.post('/logout', authenticateToken, (req, res) => {
  // 这里可以添加登出日志或其他清理操作
  res.json({ message: '登出成功' });
});

module.exports = router;