const jwt = require('jsonwebtoken');
const User = require('../models/user');

// JWT密钥（生产环境应该从环境变量读取）
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// 生成JWT令牌
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      email: user.email 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// 验证JWT令牌中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: '认证令牌已过期' });
      }
      return res.status(403).json({ error: '无效的认证令牌' });
    }

    // 将用户信息添加到请求对象
    req.user = decoded;
    
    // 验证用户是否仍然存在且处于活跃状态
    User.getById(decoded.id, (dbErr, user) => {
      if (dbErr || !user) {
        return res.status(401).json({ error: '用户不存在' });
      }
      
      if (!user.is_active) {
        return res.status(403).json({ error: '用户账号已被禁用' });
      }
      
      // 将完整的用户信息添加到请求对象
      req.user = user;
      next();
    });
  });
}

// 可选的认证中间件（如果提供了令牌则验证，否则继续）
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      req.user = null;
      return next();
    }

    User.getById(decoded.id, (dbErr, user) => {
      req.user = (dbErr || !user || !user.is_active) ? null : user;
      next();
    });
  });
}

// 刷新令牌
function refreshToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: '无效的认证令牌' });
    }

    // 检查令牌是否过期太久（超过30天）
    const tokenExp = decoded.exp * 1000; // 转换为毫秒
    const now = Date.now();
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    
    if (now - tokenExp > thirtyDaysInMs) {
      return res.status(401).json({ error: '认证令牌已过期太久，请重新登录' });
    }

    User.getById(decoded.id, (dbErr, user) => {
      if (dbErr || !user) {
        return res.status(401).json({ error: '用户不存在' });
      }
      
      if (!user.is_active) {
        return res.status(403).json({ error: '用户账号已被禁用' });
      }
      
      // 生成新令牌
      const newToken = generateToken(user);
      res.json({ token: newToken, user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name
      }});
    });
  });
}

module.exports = {
  generateToken,
  authenticateToken,
  optionalAuth,
  refreshToken,
  JWT_SECRET
};