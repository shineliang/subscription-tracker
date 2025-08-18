const moment = require('moment');

// 验证订阅数据
const validateSubscription = (req, res, next) => {
  const { name, amount, billing_cycle, start_date, cycle_count, reminder_days } = req.body;
  const errors = [];
  
  // 验证必需字段
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('订阅名称不能为空');
  }
  
  if (amount === undefined || amount === null) {
    errors.push('金额不能为空');
  } else {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      errors.push('金额必须是大于0的数字');
    }
  }
  
  if (!billing_cycle) {
    errors.push('计费周期不能为空');
  } else {
    const validCycles = ['daily', 'weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly'];
    if (!validCycles.includes(billing_cycle)) {
      errors.push('无效的计费周期');
    }
  }
  
  if (!start_date) {
    errors.push('开始日期不能为空');
  } else if (!moment(start_date, 'YYYY-MM-DD', true).isValid()) {
    errors.push('开始日期格式无效，应为 YYYY-MM-DD');
  }
  
  // 验证可选字段
  if (cycle_count !== undefined) {
    const numCycleCount = parseInt(cycle_count);
    if (isNaN(numCycleCount) || numCycleCount < 1) {
      errors.push('周期数必须是大于0的整数');
    }
  }
  
  if (reminder_days !== undefined) {
    const numReminderDays = parseInt(reminder_days);
    if (isNaN(numReminderDays) || numReminderDays < 0 || numReminderDays > 365) {
      errors.push('提醒天数必须在0-365之间');
    }
  }
  
  // 如果有错误，返回错误响应
  if (errors.length > 0) {
    return res.status(400).json({ 
      error: '输入验证失败', 
      details: errors 
    });
  }
  
  // 清理和转换数据
  req.body.name = name.trim();
  req.body.amount = parseFloat(amount);
  if (cycle_count !== undefined) {
    req.body.cycle_count = parseInt(cycle_count);
  }
  if (reminder_days !== undefined) {
    req.body.reminder_days = parseInt(reminder_days);
  }
  
  next();
};

// 验证ID参数
const validateId = (req, res, next) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ error: 'ID参数缺失' });
  }
  
  const numId = parseInt(id);
  if (isNaN(numId) || numId < 1) {
    return res.status(400).json({ error: '无效的ID参数' });
  }
  
  req.params.id = numId;
  next();
};

// 验证邮箱
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 验证通知设置
const validateNotificationSettings = (req, res, next) => {
  const { email, notify_days_before, email_notifications, browser_notifications } = req.body;
  const errors = [];
  
  if (email && !validateEmail(email)) {
    errors.push('无效的邮箱地址');
  }
  
  if (notify_days_before !== undefined) {
    const days = parseInt(notify_days_before);
    if (isNaN(days) || days < 0 || days > 365) {
      errors.push('提醒天数必须在0-365之间');
    }
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ 
      error: '输入验证失败', 
      details: errors 
    });
  }
  
  // 清理数据
  if (notify_days_before !== undefined) {
    req.body.notify_days_before = parseInt(notify_days_before);
  }
  if (email_notifications !== undefined) {
    req.body.email_notifications = Boolean(email_notifications);
  }
  if (browser_notifications !== undefined) {
    req.body.browser_notifications = Boolean(browser_notifications);
  }
  
  next();
};

module.exports = {
  validateSubscription,
  validateId,
  validateEmail,
  validateNotificationSettings
};