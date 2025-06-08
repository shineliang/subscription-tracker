const express = require('express');
const router = express.Router();
const Subscription = require('../models/subscription');
const Reminder = require('../models/reminder');
const NotificationSetting = require('../models/notificationSetting');
const axios = require('axios');
const moment = require('moment');
const { Parser } = require('json2csv');
const multer = require('multer');
const path = require('path');

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 确保上传目录存在
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 文件大小限制
    files: 1 // 只允许上传一个文件
  },
  fileFilter: function (req, file, cb) {
    // 只允许CSV文件
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv' || file.mimetype !== 'text/csv') {
      return cb(new Error('只允许上传CSV文件'));
    }
    cb(null, true);
  }
});
const fs = require('fs');
const { parse } = require('csv-parse');
const { validateSubscription, validateId, validateNotificationSettings } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

// 计算下一个付款日期并完善订阅信息
function extract_subscription_info(subscriptionInfo) {
  // 创建一个新对象，避免直接修改原对象
  const processedInfo = { ...subscriptionInfo };
  
  // 确保开始日期格式正确
  if (!processedInfo.start_date) {
    processedInfo.start_date = moment().format('YYYY-MM-DD');
  } else if (!moment(processedInfo.start_date, 'YYYY-MM-DD', true).isValid()) {
    // 如果日期格式不正确，尝试解析或使用当前日期
    try {
      processedInfo.start_date = moment(new Date(processedInfo.start_date)).format('YYYY-MM-DD');
    } catch (err) {
      processedInfo.start_date = moment().format('YYYY-MM-DD');
    }
  }
  
  // 如果还没有下一个付款日期，根据计费周期和开始日期计算
  if (!processedInfo.next_payment_date) {
    const startDate = moment(processedInfo.start_date);
    let cycleCount = processedInfo.cycle_count || 1;
    
    switch (processedInfo.billing_cycle) {
      case 'monthly':
        processedInfo.next_payment_date = startDate.clone().add(cycleCount, 'months').format('YYYY-MM-DD');
        break;
      case 'yearly':
        processedInfo.next_payment_date = startDate.clone().add(cycleCount, 'years').format('YYYY-MM-DD');
        break;
      case 'half_yearly':
        processedInfo.next_payment_date = startDate.clone().add(6 * cycleCount, 'months').format('YYYY-MM-DD');
        break;
      case 'quarterly':
        processedInfo.next_payment_date = startDate.clone().add(3 * cycleCount, 'months').format('YYYY-MM-DD');
        break;
      case 'weekly':
        processedInfo.next_payment_date = startDate.clone().add(7 * cycleCount, 'days').format('YYYY-MM-DD');
        break;
      case 'daily':
        processedInfo.next_payment_date = startDate.clone().add(cycleCount, 'days').format('YYYY-MM-DD');
        break;
      default:
        processedInfo.next_payment_date = startDate.clone().add(1, 'months').format('YYYY-MM-DD');
        break;
    }
  } else if (!moment(processedInfo.next_payment_date, 'YYYY-MM-DD', true).isValid()) {
    // 如果下一个付款日期格式不正确，尝试解析
    try {
      processedInfo.next_payment_date = moment(new Date(processedInfo.next_payment_date)).format('YYYY-MM-DD');
    } catch (err) {
      // 如果解析失败，则计算下一个付款日期
      const startDate = moment(processedInfo.start_date);
      processedInfo.next_payment_date = startDate.clone().add(1, 'months').format('YYYY-MM-DD');
    }
  }
  
  // 设置默认值
  if (!processedInfo.currency) {
    processedInfo.currency = 'CNY';
  }
  
  if (!processedInfo.reminder_days) {
    processedInfo.reminder_days = 7;
  }
  
  if (!processedInfo.cycle_count) {
    processedInfo.cycle_count = 1;
  }
  
  if (processedInfo.active === undefined) {
    processedInfo.active = 1;
  }
  
  return processedInfo;
}

// 创建一个函数来获取格式化的当前日期
function getCurrentFormattedDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // 月份从0开始，需要+1
  const day = String(now.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// 使用模板字符串动态插入当前日期
function createMessages(description) {
  const currentDate = getCurrentFormattedDate();
  
  return [
    {
      role: "system",
      content: `您是一个专门解析软件订阅信息的助手。The current date is ${currentDate}. 请从用户的描述中提取以下信息：服务名称、提供商、金额、货币、计费周期（月/年/季度等）、开始日期。以JSON格式返回。`
    },
    {
      role: "user",
      content: description
    }
  ];
}

// 获取所有订阅
router.get('/subscriptions', authenticateToken, (req, res) => {
  Subscription.getAllByUser(req.user.id, (err, subscriptions) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(subscriptions);
  });
});

// 获取单个订阅
router.get('/subscriptions/:id', authenticateToken, validateId, (req, res) => {
  Subscription.getByIdAndUser(req.params.id, req.user.id, (err, subscription) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!subscription) {
      return res.status(404).json({ error: '订阅不存在' });
    }
    res.json(subscription);
  });
});

// 创建新订阅
router.post('/subscriptions', authenticateToken, validateSubscription, (req, res) => {
  // 使用extract_subscription_info来计算next_payment_date
  const processedData = extract_subscription_info(req.body);
  const subscription = { ...processedData, user_id: req.user.id };

  Subscription.create(subscription, (err, newSubscription) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // 为新订阅创建提醒
    Reminder.createForSubscription(
      newSubscription.id, 
      newSubscription.next_payment_date, 
      newSubscription.reminder_days, 
      (reminderErr) => {
        if (reminderErr) {
          console.error('创建提醒失败:', reminderErr);
        }
      }
    );
    
    res.status(201).json(newSubscription);
  });
});

// 更新订阅
router.put('/subscriptions/:id', authenticateToken, validateId, validateSubscription, (req, res) => {
  // 使用extract_subscription_info来计算next_payment_date
  const subscription = extract_subscription_info(req.body);
  
  Subscription.updateByUser(req.params.id, req.user.id, subscription, (err, updatedSubscription) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // 更新提醒
    Reminder.updateForSubscription(
      updatedSubscription.id,
      updatedSubscription.next_payment_date,
      updatedSubscription.reminder_days,
      (reminderErr) => {
        if (reminderErr) {
          console.error('更新提醒失败:', reminderErr);
        }
      }
    );
    
    res.json(updatedSubscription);
  });
});

// 删除订阅
router.delete('/subscriptions/:id', authenticateToken, validateId, (req, res) => {
  Subscription.deleteByUser(req.params.id, req.user.id, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

// 取消订阅（当前周期结束后不再续费）
router.post('/subscriptions/:id/cancel', authenticateToken, validateId, (req, res) => {
  const subscriptionId = req.params.id;
  
  // 获取订阅信息
  Subscription.getByIdAndUser(subscriptionId, req.user.id, (err, subscription) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!subscription) {
      return res.status(404).json({ error: '订阅不存在' });
    }
    
    if (subscription.cancelled_at) {
      return res.status(400).json({ error: '该订阅已经被取消' });
    }
    
    // 只更新cancelled_at字段，保持其他字段不变
    const updateData = {
      name: subscription.name,
      description: subscription.description,
      provider: subscription.provider,
      amount: subscription.amount,
      currency: subscription.currency,
      billing_cycle: subscription.billing_cycle,
      cycle_count: subscription.cycle_count,
      start_date: subscription.start_date,
      next_payment_date: subscription.next_payment_date, // 保持原有的下次付款日期
      reminder_days: subscription.reminder_days,
      category: subscription.category,
      active: subscription.active,
      cancelled_at: new Date().toISOString() // 只有这个字段是新设置的
    };
    
    Subscription.updateByUser(subscriptionId, req.user.id, updateData, (updateErr, result) => {
      if (updateErr) {
        return res.status(500).json({ error: updateErr.message });
      }
      
      // 记录取消历史
      const SubscriptionHistory = require('../models/subscriptionHistory');
      SubscriptionHistory.recordChange(
        subscriptionId,
        req.user.id,
        'cancelled',
        null,
        '用户取消订阅，当前周期结束后不再续费',
        (histErr) => {
          if (histErr) {
            console.error('记录订阅历史失败:', histErr);
          }
        }
      );
      
      res.json({
        ...result,
        message: '订阅已设置为当前周期结束后取消'
      });
    });
  });
});

// 续费订阅（延长下次付款日期一个周期）
router.post('/subscriptions/:id/renew', authenticateToken, validateId, (req, res) => {
  const subscriptionId = req.params.id;
  
  // 获取订阅信息
  Subscription.getByIdAndUser(subscriptionId, req.user.id, (err, subscription) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!subscription) {
      return res.status(404).json({ error: '订阅不存在' });
    }
    
    if (subscription.cancelled_at) {
      // 如果订阅已取消，续费时清除取消状态
      subscription.cancelled_at = null;
    }
    
    // 根据订阅周期计算新的下次付款日期
    // 始终基于当前的 next_payment_date 来计算，确保连续性
    const basePaymentDate = moment(subscription.next_payment_date);
    const today = moment();
    let cycleCount = subscription.cycle_count || 1;
    let newPaymentDate;
    
    // 计算下一个付款日期
    switch (subscription.billing_cycle) {
      case 'monthly':
        newPaymentDate = basePaymentDate.clone().add(cycleCount, 'months');
        break;
      case 'yearly':
        newPaymentDate = basePaymentDate.clone().add(cycleCount, 'years');
        break;
      case 'half_yearly':
        newPaymentDate = basePaymentDate.clone().add(6 * cycleCount, 'months');
        break;
      case 'quarterly':
        newPaymentDate = basePaymentDate.clone().add(3 * cycleCount, 'months');
        break;
      case 'weekly':
        newPaymentDate = basePaymentDate.clone().add(7 * cycleCount, 'days');
        break;
      case 'daily':
        newPaymentDate = basePaymentDate.clone().add(cycleCount, 'days');
        break;
      default:
        newPaymentDate = basePaymentDate.clone().add(1, 'months');
    }
    
    // 如果订阅已经过期很久，可能需要多次续费才能到未来日期
    // 但保持连续性，每次只续费一个周期
    const renewalInfo = {
      previousPaymentDate: subscription.next_payment_date,
      newPaymentDate: newPaymentDate.format('YYYY-MM-DD'),
      isOverdue: basePaymentDate.isBefore(today),
      daysPastDue: today.diff(basePaymentDate, 'days')
    };
    
    // 更新订阅的下次付款日期
    subscription.next_payment_date = renewalInfo.newPaymentDate;
    
    Subscription.updateByUser(subscriptionId, req.user.id, subscription, (updateErr, updatedSubscription) => {
      if (updateErr) {
        return res.status(500).json({ error: updateErr.message });
      }
      
      // 更新提醒
      Reminder.updateForSubscription(
        updatedSubscription.id,
        updatedSubscription.next_payment_date,
        updatedSubscription.reminder_days,
        (reminderErr) => {
          if (reminderErr) {
            console.error('更新提醒失败:', reminderErr);
          }
        }
      );
      
      // 记录付款历史
      const PaymentHistory = require('../models/paymentHistory');
      PaymentHistory.recordPayment({
        subscription_id: subscriptionId,
        user_id: req.user.id,
        amount: subscription.amount,
        currency: subscription.currency,
        payment_date: renewalInfo.previousPaymentDate,
        payment_method: req.body.payment_method || null,
        notes: req.body.notes || (renewalInfo.isOverdue ? 
          `手动续费（已过期${renewalInfo.daysPastDue}天）` : 
          '手动续费')
      }, (paymentErr) => {
        if (paymentErr) {
          console.error('记录付款历史失败:', paymentErr);
        }
      });
      
      // 构建响应信息
      let message = '订阅已成功续费一个周期';
      if (renewalInfo.isOverdue) {
        message += `（订阅已过期${renewalInfo.daysPastDue}天，已按连续周期续费）`;
      }
      
      res.json({
        ...updatedSubscription,
        message: message,
        renewalInfo: renewalInfo
      });
    });
  });
});

// 获取即将到期的订阅
router.get('/subscriptions/upcoming/:days', authenticateToken, (req, res) => {
  const days = parseInt(req.params.days) || 7;
  
  Subscription.getUpcomingByUser(req.user.id, days, (err, subscriptions) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(subscriptions);
  });
});

// 获取每月花费
router.get('/statistics/monthly', authenticateToken, (req, res) => {
  Subscription.getMonthlySpendingByUser(req.user.id, (err, stats) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(stats);
  });
});

// 获取每年花费
router.get('/statistics/yearly', authenticateToken, (req, res) => {
  Subscription.getYearlySpendingByUser(req.user.id, (err, stats) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(stats);
  });
});

// 按类别获取花费
router.get('/statistics/by-category', authenticateToken, (req, res) => {
  const timeframe = req.query.timeframe || 'monthly';
  Subscription.getSpendingByCategoryByUser(req.user.id, timeframe, (err, stats) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(stats);
  });
});

// 获取月度趋势数据
router.get('/statistics/monthly-trend', authenticateToken, (req, res) => {
  Subscription.getMonthlyTrendByUser(req.user.id, (err, stats) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(stats);
  });
});

// 获取通知设置
router.get('/notification-settings', authenticateToken, (req, res) => {
  NotificationSetting.getByUser(req.user.id, (err, settings) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(settings);
  });
});

// 更新通知设置
router.put('/notification-settings', authenticateToken, validateNotificationSettings, (req, res) => {
  const settings = req.body;
  
  NotificationSetting.updateByUser(req.user.id, settings, (err, updatedSettings) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(updatedSettings);
  });
});

// LLM API整合 - 解析订阅信息
router.post('/parse-subscription', authenticateToken, async (req, res) => {
  try {
    const { description } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: '请提供描述信息' });
    }
    
    // 获取当前日期
    const currentDate = getCurrentFormattedDate();
    
    // 使用createMessages函数生成包含当前日期的消息
    const messages = createMessages(description);
    
    const response = await axios.post(
      process.env.OPENAI_API_BASE || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        model: process.env.OPENAI_API_MODEL || "qwen-max-latest",
        messages: messages,
        functions: [
          {
            name: "extract_subscription_info",
            description: "从用户描述中提取订阅信息",
            parameters: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "订阅服务名称"
                },
                provider: {
                  type: "string",
                  description: "服务提供商"
                },
                amount: {
                  type: "number",
                  description: "金额"
                },
                currency: {
                  type: "string",
                  description: "货币单位，默认CNY"
                },
                billing_cycle: {
                type: "string",
                description: "计费周期: monthly, half_yearly, yearly, quarterly, weekly, daily"
                },
                start_date: {
                  type: "string",
                  description: "开始日期，格式YYYY-MM-DD"
                },
                next_payment_date: {
                  type: "string",
                  description: "下次付款日期，格式YYYY-MM-DD"
                },
                category: {
                  type: "string",
                  description: "订阅类别，如软件、娱乐、工具等"
                }
              },
              required: ["name", "amount", "billing_cycle"]
            }
          }
        ],
        function_call: { name: "extract_subscription_info" }
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
    
    const functionCall = response.data.choices[0].message.function_call;
    const parsedInfo = JSON.parse(functionCall.arguments);
    console.log('LLM原始解析结果:', parsedInfo);
    
    // 使用计算函数处理数据，完善信息并计算next_payment_date
    const processedInfo = extract_subscription_info(parsedInfo);
    console.log('处理后的订阅信息:', processedInfo);
    
    res.json(processedInfo);
  } catch (error) {
    console.error('解析订阅信息失败:', error);
    res.status(500).json({ error: '解析订阅信息失败', details: error.message });
  }
});

// 导出所有订阅数据
router.get('/export-data', authenticateToken, async (req, res) => {
  try {
    // 获取用户的所有订阅数据
    Subscription.getAllByUser(req.user.id, (err, subscriptions) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // 定义CSV字段
      const fields = [
        'id',
        'name',
        'description',
        'provider',
        'amount',
        'currency',
        'billing_cycle',
        'start_date',
        'next_payment_date',
        'reminder_days',
        'cycle_count',
        'active',
        'created_at',
        'updated_at'
      ];
      
      // 创建CSV解析器
      const json2csvParser = new Parser({ fields });
      
      // 转换为CSV
      const csv = json2csvParser.parse(subscriptions);
      
      // 设置响应头
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=subscriptions.csv');
      
      // 发送CSV数据
      res.send(csv);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 导入订阅数据
router.post('/import-data', authenticateToken, upload.single('file'), async (req, res) => {
  const filePath = req.file ? req.file.path : null;
  
  // 文件清理函数
  const cleanupFile = () => {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('删除临时文件失败:', err);
      }
    }
  };
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: true
    });

    const records = [];
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // 创建解析器流
    parser.on('readable', function() {
      let record;
      while ((record = parser.read()) !== null) {
        // 移除id字段，因为这是新导入的数据
        delete record.id;
        // 移除created_at和updated_at字段，让数据库自动生成
        delete record.created_at;
        delete record.updated_at;
        
        // 处理数值类型和验证
        if (record.amount !== undefined) {
          const amount = parseFloat(record.amount);
          if (isNaN(amount) || amount <= 0) {
            errors.push(`无效的金额: ${record.amount}`);
            continue;
          }
          record.amount = amount;
        }
        if (record.reminder_days !== undefined) {
          const days = parseInt(record.reminder_days);
          record.reminder_days = isNaN(days) ? 7 : days;
        }
        if (record.cycle_count !== undefined) {
          const count = parseInt(record.cycle_count);
          record.cycle_count = isNaN(count) ? 1 : count;
        }
        if (record.active !== undefined) {
          record.active = parseInt(record.active) || 1;
        }
        
        records.push(record);
      }
    });

    // 处理解析完成
    parser.on('end', async function() {
      try {
        // 使用Promise.all处理所有导入
        const importPromises = records.map((subscription, index) => {
          return new Promise((resolve) => {
            const processedSubscription = extract_subscription_info(subscription);
            // 添加当前用户ID
            processedSubscription.user_id = req.user.id;
            Subscription.create(processedSubscription, (err) => {
              if (err) {
                console.error(`导入第${index + 1}行失败:`, err);
                errors.push(`第${index + 1}行: ${err.message}`);
                errorCount++;
              } else {
                successCount++;
              }
              resolve();
            });
          });
        });

        await Promise.all(importPromises);

        // 清理文件
        cleanupFile();

        res.json({
          message: '导入完成',
          total: records.length,
          success: successCount,
          error: errorCount,
          errors: errors.slice(0, 10) // 最多返回10个错误信息
        });
      } catch (err) {
        cleanupFile();
        throw err;
      }
    });

    // 处理解析错误
    parser.on('error', function(err) {
      console.error('解析CSV文件失败:', err);
      cleanupFile();
      res.status(500).json({ error: '解析CSV文件失败: ' + err.message });
    });

    // 开始解析文件
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('读取文件失败:', err);
      cleanupFile();
      res.status(500).json({ error: '读取文件失败' });
    });
    
    stream.pipe(parser);

  } catch (error) {
    console.error('导入数据失败:', error);
    cleanupFile();
    res.status(500).json({ error: error.message });
  }
});

// ========== 订阅历史相关 API ==========

// 获取订阅的历史记录
router.get('/subscriptions/:id/history', authenticateToken, validateId, (req, res) => {
  const SubscriptionHistory = require('../models/subscriptionHistory');
  
  SubscriptionHistory.getBySubscriptionId(req.params.id, req.user.id, (err, history) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(history);
  });
});

// 获取用户的所有历史记录
router.get('/subscription-history', authenticateToken, (req, res) => {
  const SubscriptionHistory = require('../models/subscriptionHistory');
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  
  SubscriptionHistory.getAllByUser(req.user.id, limit, offset, (err, history) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(history);
  });
});

// ========== 付款历史相关 API ==========

// 记录付款
router.post('/payments', authenticateToken, (req, res) => {
  const PaymentHistory = require('../models/paymentHistory');
  const paymentData = {
    ...req.body,
    user_id: req.user.id
  };
  
  // 验证必填字段
  if (!paymentData.subscription_id || !paymentData.amount || !paymentData.payment_date) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  
  PaymentHistory.recordPayment(paymentData, (err, payment) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json(payment);
  });
});

// 获取订阅的付款历史
router.get('/subscriptions/:id/payments', authenticateToken, validateId, (req, res) => {
  const PaymentHistory = require('../models/paymentHistory');
  
  PaymentHistory.getBySubscriptionId(req.params.id, req.user.id, (err, payments) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(payments);
  });
});

// 获取用户的所有付款历史
router.get('/payments', authenticateToken, (req, res) => {
  const PaymentHistory = require('../models/paymentHistory');
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  
  PaymentHistory.getAllByUser(req.user.id, limit, offset, (err, payments) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(payments);
  });
});

// 获取指定时间段的付款历史
router.get('/payments/date-range', authenticateToken, (req, res) => {
  const PaymentHistory = require('../models/paymentHistory');
  const { start_date, end_date } = req.query;
  
  if (!start_date || !end_date) {
    return res.status(400).json({ error: '请提供开始日期和结束日期' });
  }
  
  PaymentHistory.getByDateRange(req.user.id, start_date, end_date, (err, payments) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(payments);
  });
});

// 获取付款统计
router.get('/payments/stats/:year', authenticateToken, (req, res) => {
  const PaymentHistory = require('../models/paymentHistory');
  const year = parseInt(req.params.year) || new Date().getFullYear();
  
  PaymentHistory.getPaymentStats(req.user.id, year, (err, stats) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(stats);
  });
});

// ========== 预算管理相关 API ==========
const Budget = require('../models/budget');

// 获取所有预算
router.get('/budgets', authenticateToken, (req, res) => {
  Budget.getAllByUser(req.user.id, (err, budgets) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(budgets);
  });
});

// 获取单个预算
router.get('/budgets/:id', authenticateToken, validateId, (req, res) => {
  Budget.getByIdAndUser(req.params.id, req.user.id, (err, budget) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!budget) {
      return res.status(404).json({ error: '预算不存在' });
    }
    res.json(budget);
  });
});

// 创建新预算
router.post('/budgets', authenticateToken, (req, res) => {
  const { name, type, period, amount, currency, category, warning_threshold } = req.body;
  
  // 验证必填字段
  if (!name || !type || !period || !amount) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  
  // 验证type和period的值
  if (!['total', 'category'].includes(type)) {
    return res.status(400).json({ error: '无效的预算类型' });
  }
  
  if (!['monthly', 'yearly'].includes(period)) {
    return res.status(400).json({ error: '无效的预算周期' });
  }
  
  // 如果是分类预算，必须指定类别
  if (type === 'category' && !category) {
    return res.status(400).json({ error: '分类预算必须指定类别' });
  }
  
  // 检查是否已存在相同类型的预算
  Budget.getByTypeAndPeriod(req.user.id, type, period, category, (err, existing) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (existing && existing.is_active) {
      return res.status(400).json({ error: '已存在相同类型的预算' });
    }
    
    const budget = {
      user_id: req.user.id,
      name,
      type,
      period,
      amount: parseFloat(amount),
      currency: currency || 'CNY',
      category: type === 'category' ? category : null,
      warning_threshold: warning_threshold || 80
    };
    
    Budget.create(budget, (err, newBudget) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json(newBudget);
    });
  });
});

// 更新预算
router.put('/budgets/:id', authenticateToken, validateId, (req, res) => {
  const { name, amount, currency, warning_threshold, is_active } = req.body;
  
  if (!name || amount === undefined) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  
  const budget = {
    name,
    amount: parseFloat(amount),
    currency,
    warning_threshold,
    is_active
  };
  
  Budget.updateByUser(req.params.id, req.user.id, budget, (err, updatedBudget) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(updatedBudget);
  });
});

// 删除预算
router.delete('/budgets/:id', authenticateToken, validateId, (req, res) => {
  Budget.deleteByUser(req.params.id, req.user.id, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

// 获取预算使用情况
router.get('/budgets/:id/usage', authenticateToken, validateId, (req, res) => {
  Budget.getBudgetUsage(req.user.id, req.params.id, (err, usage) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(usage);
  });
});

// 获取所有预算的使用情况
router.get('/budgets-usage', authenticateToken, (req, res) => {
  Budget.getAllBudgetUsage(req.user.id, (err, usages) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(usages);
  });
});

// 检查并创建预算警告
router.post('/budgets/check-alerts', authenticateToken, (req, res) => {
  Budget.checkAndCreateAlerts(req.user.id, (err, alerts) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(alerts);
  });
});

// 获取未读预算警告
router.get('/budget-alerts', authenticateToken, (req, res) => {
  Budget.getUnreadAlerts(req.user.id, (err, alerts) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(alerts);
  });
});

// 标记预算警告为已读
router.put('/budget-alerts/mark-read', authenticateToken, (req, res) => {
  const { alertIds } = req.body;
  
  if (!alertIds || !Array.isArray(alertIds)) {
    return res.status(400).json({ error: '请提供要标记的警告ID数组' });
  }
  
  Budget.markAlertsAsRead(req.user.id, alertIds, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

// ========== 智能分析相关 API ==========

// 重复订阅检测
router.get('/analysis/duplicate-subscriptions', authenticateToken, (req, res) => {
  Subscription.getAllByUser(req.user.id, (err, subscriptions) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const duplicates = [];
    const processed = new Set();
    
    subscriptions.forEach((sub1, i) => {
      if (processed.has(sub1.id)) return;
      
      const similarSubs = [];
      
      subscriptions.forEach((sub2, j) => {
        if (i === j || processed.has(sub2.id)) return;
        
        // 检测相同名称或提供商
        const isSameName = sub1.name.toLowerCase() === sub2.name.toLowerCase();
        const isSameProvider = sub1.provider && sub2.provider && 
          sub1.provider.toLowerCase() === sub2.provider.toLowerCase();
        
        // 检测相似名称（使用简单的包含关系）
        const isSimilarName = sub1.name.toLowerCase().includes(sub2.name.toLowerCase()) ||
          sub2.name.toLowerCase().includes(sub1.name.toLowerCase());
        
        // 检测相同类别和相近金额（±20%）
        const isSameCategory = sub1.category === sub2.category;
        const amountRatio = Math.abs(sub1.amount - sub2.amount) / Math.max(sub1.amount, sub2.amount);
        const isSimilarAmount = amountRatio <= 0.2;
        
        if ((isSameName || isSameProvider || (isSimilarName && isSameCategory && isSimilarAmount))) {
          similarSubs.push(sub2);
          processed.add(sub2.id);
        }
      });
      
      if (similarSubs.length > 0) {
        processed.add(sub1.id);
        duplicates.push({
          main: sub1,
          duplicates: similarSubs,
          reason: similarSubs[0].name === sub1.name ? 'same_name' : 
                  similarSubs[0].provider === sub1.provider ? 'same_provider' : 'similar',
          potentialSavings: similarSubs.reduce((sum, s) => {
            // 转换为月度金额进行比较
            let monthlyAmount = s.amount;
            switch (s.billing_cycle) {
              case 'yearly': monthlyAmount = s.amount / 12; break;
              case 'half_yearly': monthlyAmount = s.amount / 6; break;
              case 'quarterly': monthlyAmount = s.amount / 3; break;
              case 'weekly': monthlyAmount = s.amount * 4.33; break;
              case 'daily': monthlyAmount = s.amount * 30.44; break;
            }
            return sum + monthlyAmount;
          }, 0)
        });
      }
    });
    
    res.json({
      duplicates,
      totalPotentialSavings: duplicates.reduce((sum, d) => sum + d.potentialSavings, 0),
      count: duplicates.length
    });
  });
});

// 使用频率分析
router.get('/analysis/usage-frequency', authenticateToken, (req, res) => {
  const PaymentHistory = require('../models/paymentHistory');
  const sixMonthsAgo = moment().subtract(6, 'months').format('YYYY-MM-DD');
  
  Subscription.getAllByUser(req.user.id, (err, subscriptions) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const analysisPromises = subscriptions.map(sub => {
      return new Promise((resolve) => {
        PaymentHistory.getBySubscriptionId(sub.id, req.user.id, (err, payments) => {
          if (err) {
            resolve({ subscription: sub, analysis: { error: true } });
            return;
          }
          
          // 分析付款频率
          const recentPayments = payments.filter(p => 
            moment(p.payment_date).isAfter(sixMonthsAgo) && p.status === 'completed'
          );
          
          // 计算预期付款次数
          let expectedPayments = 0;
          const monthsDiff = moment().diff(moment(sub.start_date), 'months');
          
          switch (sub.billing_cycle) {
            case 'monthly': expectedPayments = Math.min(monthsDiff, 6); break;
            case 'yearly': expectedPayments = monthsDiff >= 12 ? 1 : 0; break;
            case 'half_yearly': expectedPayments = Math.floor(monthsDiff / 6); break;
            case 'quarterly': expectedPayments = Math.floor(monthsDiff / 3); break;
            case 'weekly': expectedPayments = Math.min(Math.floor(monthsDiff * 4.33), 26); break;
            case 'daily': expectedPayments = Math.min(monthsDiff * 30, 180); break;
          }
          
          const usageRate = expectedPayments > 0 ? 
            (recentPayments.length / expectedPayments) * 100 : 100;
          
          resolve({
            subscription: sub,
            analysis: {
              actualPayments: recentPayments.length,
              expectedPayments,
              usageRate: Math.min(usageRate, 100),
              status: usageRate < 50 ? 'low' : usageRate < 80 ? 'medium' : 'high',
              recommendation: usageRate < 50 ? 
                '使用频率较低，建议考虑是否需要继续订阅' : 
                usageRate < 80 ? '使用频率中等，可以考虑降级订阅计划' : '使用频率正常'
            }
          });
        });
      });
    });
    
    Promise.all(analysisPromises).then(results => {
      const lowUsageSubscriptions = results.filter(r => 
        r.analysis.status === 'low' && !r.analysis.error
      );
      
      res.json({
        results: results.filter(r => !r.analysis.error),
        lowUsageCount: lowUsageSubscriptions.length,
        potentialSavings: lowUsageSubscriptions.reduce((sum, r) => {
          let monthlyAmount = r.subscription.amount;
          switch (r.subscription.billing_cycle) {
            case 'yearly': monthlyAmount = r.subscription.amount / 12; break;
            case 'half_yearly': monthlyAmount = r.subscription.amount / 6; break;
            case 'quarterly': monthlyAmount = r.subscription.amount / 3; break;
            case 'weekly': monthlyAmount = r.subscription.amount * 4.33; break;
            case 'daily': monthlyAmount = r.subscription.amount * 30.44; break;
          }
          return sum + monthlyAmount;
        }, 0)
      });
    });
  });
});

// 成本效益分析
router.get('/analysis/cost-benefit', authenticateToken, (req, res) => {
  Subscription.getAllByUser(req.user.id, (err, subscriptions) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // 按类别分组
    const categoryAnalysis = {};
    let totalMonthlySpend = 0;
    
    subscriptions.forEach(sub => {
      const category = sub.category || '未分类';
      
      if (!categoryAnalysis[category]) {
        categoryAnalysis[category] = {
          subscriptions: [],
          totalMonthlyAmount: 0,
          averageAmount: 0
        };
      }
      
      // 转换为月度金额
      let monthlyAmount = sub.amount;
      switch (sub.billing_cycle) {
        case 'yearly': monthlyAmount = sub.amount / 12; break;
        case 'half_yearly': monthlyAmount = sub.amount / 6; break;
        case 'quarterly': monthlyAmount = sub.amount / 3; break;
        case 'weekly': monthlyAmount = sub.amount * 4.33; break;
        case 'daily': monthlyAmount = sub.amount * 30.44; break;
      }
      
      categoryAnalysis[category].subscriptions.push({
        ...sub,
        monthlyAmount
      });
      categoryAnalysis[category].totalMonthlyAmount += monthlyAmount;
      totalMonthlySpend += monthlyAmount;
    });
    
    // 计算平均值和占比
    Object.keys(categoryAnalysis).forEach(category => {
      const cat = categoryAnalysis[category];
      cat.averageAmount = cat.totalMonthlyAmount / cat.subscriptions.length;
      cat.percentage = (cat.totalMonthlyAmount / totalMonthlySpend) * 100;
      
      // 找出该类别中最贵的订阅
      cat.mostExpensive = cat.subscriptions.reduce((max, sub) => 
        sub.monthlyAmount > max.monthlyAmount ? sub : max
      );
      
      // 成本效益评分（基于使用频率和金额）
      cat.costBenefitScore = cat.percentage > 30 ? 'high_cost' : 
                            cat.percentage > 15 ? 'medium_cost' : 'low_cost';
    });
    
    // 生成优化建议
    const recommendations = [];
    
    Object.entries(categoryAnalysis).forEach(([category, data]) => {
      if (data.percentage > 30) {
        recommendations.push({
          category,
          type: 'high_spending',
          message: `${category}类别支出占比过高(${data.percentage.toFixed(1)}%)，建议审查该类别订阅`,
          potentialSavings: data.totalMonthlyAmount * 0.2 // 假设可节省20%
        });
      }
      
      if (data.subscriptions.length > 3) {
        recommendations.push({
          category,
          type: 'too_many_subscriptions',
          message: `${category}类别订阅过多(${data.subscriptions.length}个)，建议整合或取消部分订阅`,
          subscriptionCount: data.subscriptions.length
        });
      }
    });
    
    res.json({
      categoryAnalysis,
      totalMonthlySpend,
      recommendations,
      topCategories: Object.entries(categoryAnalysis)
        .sort((a, b) => b[1].totalMonthlyAmount - a[1].totalMonthlyAmount)
        .slice(0, 5)
        .map(([category, data]) => ({
          category,
          amount: data.totalMonthlyAmount,
          percentage: data.percentage
        }))
    });
  });
});

// 订阅优化建议
router.get('/analysis/optimization-suggestions', authenticateToken, async (req, res) => {
  try {
    const [subscriptions, duplicates, usageAnalysis, costBenefit] = await Promise.all([
      new Promise((resolve, reject) => {
        Subscription.getAllByUser(req.user.id, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      }),
      new Promise((resolve) => {
        // 获取重复订阅分析
        Subscription.getAllByUser(req.user.id, (err, subs) => {
          if (err) {
            resolve({ duplicates: [], totalPotentialSavings: 0 });
            return;
          }
          
          const duplicates = [];
          const processed = new Set();
          
          subs.forEach((sub1, i) => {
            if (processed.has(sub1.id)) return;
            
            const similarSubs = [];
            subs.forEach((sub2, j) => {
              if (i === j || processed.has(sub2.id)) return;
              
              if (sub1.name.toLowerCase() === sub2.name.toLowerCase() ||
                  (sub1.provider && sub2.provider && 
                   sub1.provider.toLowerCase() === sub2.provider.toLowerCase())) {
                similarSubs.push(sub2);
                processed.add(sub2.id);
              }
            });
            
            if (similarSubs.length > 0) {
              processed.add(sub1.id);
              duplicates.push({
                main: sub1,
                duplicates: similarSubs
              });
            }
          });
          
          resolve({ duplicates });
        });
      }),
      Promise.resolve({ results: [] }), // 简化使用频率分析
      Promise.resolve({ categoryAnalysis: {} }) // 简化成本效益分析
    ]);
    
    const suggestions = [];
    let totalPotentialSavings = 0;
    
    // 1. 重复订阅建议
    duplicates.duplicates.forEach(dup => {
      suggestions.push({
        type: 'duplicate',
        priority: 'high',
        subscription: dup.main,
        title: '发现重复订阅',
        description: `您有${dup.duplicates.length + 1}个相似的订阅服务`,
        action: '建议保留一个，取消其他重复订阅',
        savings: dup.duplicates.reduce((sum, s) => sum + s.amount, 0)
      });
      totalPotentialSavings += dup.duplicates.reduce((sum, s) => sum + s.amount, 0);
    });
    
    // 2. 长期未使用建议
    subscriptions.forEach(sub => {
      const daysSincePayment = moment().diff(moment(sub.next_payment_date), 'days');
      if (daysSincePayment > 60 && sub.active) {
        suggestions.push({
          type: 'unused',
          priority: 'medium',
          subscription: sub,
          title: '长期未续费',
          description: `该订阅已经${daysSincePayment}天未续费`,
          action: '建议确认是否仍需要该服务',
          savings: sub.amount
        });
        totalPotentialSavings += sub.amount;
      }
    });
    
    // 3. 年付优化建议
    subscriptions.filter(sub => sub.billing_cycle === 'monthly').forEach(sub => {
      const yearlyAmount = sub.amount * 12;
      const potentialYearlySavings = yearlyAmount * 0.15; // 假设年付可节省15%
      
      if (potentialYearlySavings > 100) {
        suggestions.push({
          type: 'billing_optimization',
          priority: 'low',
          subscription: sub,
          title: '计费周期优化',
          description: '切换到年付可能节省费用',
          action: `建议改为年付，预计每年节省￥${potentialYearlySavings.toFixed(2)}`,
          savings: potentialYearlySavings / 12
        });
      }
    });
    
    // 4. 高额订阅审查
    const avgAmount = subscriptions.reduce((sum, s) => sum + s.amount, 0) / subscriptions.length;
    subscriptions.filter(sub => sub.amount > avgAmount * 2).forEach(sub => {
      suggestions.push({
        type: 'high_cost',
        priority: 'medium',
        subscription: sub,
        title: '高额订阅',
        description: `该订阅费用是平均值的${(sub.amount / avgAmount).toFixed(1)}倍`,
        action: '建议评估是否物有所值或寻找替代方案',
        savings: 0
      });
    });
    
    // 按优先级排序
    suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    res.json({
      suggestions: suggestions.slice(0, 10), // 返回前10个建议
      totalPotentialSavings,
      subscriptionCount: subscriptions.length,
      summary: {
        duplicates: duplicates.duplicates.length,
        unused: suggestions.filter(s => s.type === 'unused').length,
        highCost: suggestions.filter(s => s.type === 'high_cost').length,
        optimizable: suggestions.filter(s => s.type === 'billing_optimization').length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 趋势分析报告
router.get('/analysis/trend-report', authenticateToken, (req, res) => {
  const months = parseInt(req.query.months) || 6;
  
  Subscription.getMonthlyTrendByUser(req.user.id, (err, monthlyData) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // 只取指定月数的数据
    const trendData = monthlyData.slice(0, months);
    
    // 计算趋势
    const amounts = trendData.map(d => d.amount.CNY || 0);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    
    // 计算增长率
    let growthRate = 0;
    if (amounts.length >= 2) {
      const firstMonth = amounts[amounts.length - 1];
      const lastMonth = amounts[0];
      growthRate = firstMonth > 0 ? ((lastMonth - firstMonth) / firstMonth) * 100 : 0;
    }
    
    // 找出波动
    const volatility = Math.sqrt(
      amounts.reduce((sum, amount) => sum + Math.pow(amount - avgAmount, 2), 0) / amounts.length
    );
    
    // 预测下个月
    let nextMonthPrediction = avgAmount;
    if (amounts.length >= 3) {
      // 简单线性回归预测
      const recentAmounts = amounts.slice(0, 3);
      const trend = (recentAmounts[0] - recentAmounts[2]) / 2;
      nextMonthPrediction = recentAmounts[0] + trend;
    }
    
    // 按类别分析趋势
    Subscription.getAllByUser(req.user.id, (err, subscriptions) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const categoryTrends = {};
      const currentDate = moment();
      
      subscriptions.forEach(sub => {
        const category = sub.category || '未分类';
        if (!categoryTrends[category]) {
          categoryTrends[category] = {
            current: 0,
            previous: 0,
            growth: 0
          };
        }
        
        // 计算月度金额
        let monthlyAmount = sub.amount;
        switch (sub.billing_cycle) {
          case 'yearly': monthlyAmount = sub.amount / 12; break;
          case 'half_yearly': monthlyAmount = sub.amount / 6; break;
          case 'quarterly': monthlyAmount = sub.amount / 3; break;
          case 'weekly': monthlyAmount = sub.amount * 4.33; break;
          case 'daily': monthlyAmount = sub.amount * 30.44; break;
        }
        
        // 判断是否为新订阅（3个月内）
        const isNew = moment(sub.created_at).isAfter(currentDate.clone().subtract(3, 'months'));
        
        categoryTrends[category].current += monthlyAmount;
        if (!isNew) {
          categoryTrends[category].previous += monthlyAmount;
        }
      });
      
      // 计算各类别增长
      Object.keys(categoryTrends).forEach(category => {
        const trend = categoryTrends[category];
        if (trend.previous > 0) {
          trend.growth = ((trend.current - trend.previous) / trend.previous) * 100;
        }
      });
      
      res.json({
        period: `过去${months}个月`,
        trendData,
        statistics: {
          averageMonthlySpend: avgAmount,
          growthRate,
          volatility,
          trend: growthRate > 5 ? 'increasing' : growthRate < -5 ? 'decreasing' : 'stable',
          nextMonthPrediction: Math.max(0, nextMonthPrediction)
        },
        categoryTrends,
        insights: [
          growthRate > 10 ? '您的订阅支出呈快速增长趋势，建议审查新增订阅' : null,
          growthRate < -10 ? '您的订阅支出在下降，优化措施正在生效' : null,
          volatility > avgAmount * 0.3 ? '支出波动较大，可能存在不规律的大额订阅' : null,
          Object.keys(categoryTrends).some(cat => categoryTrends[cat].growth > 50) ? 
            '某些类别支出增长过快，需要关注' : null
        ].filter(Boolean)
      });
    });
  });
});

// 个性化推荐
router.get('/analysis/recommendations', authenticateToken, async (req, res) => {
  try {
    const subscriptions = await new Promise((resolve, reject) => {
      Subscription.getAllByUser(req.user.id, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
    
    const recommendations = [];
    
    // 分析用户订阅模式
    const categories = {};
    let totalMonthlySpend = 0;
    
    subscriptions.forEach(sub => {
      const category = sub.category || '未分类';
      if (!categories[category]) {
        categories[category] = { count: 0, amount: 0 };
      }
      
      let monthlyAmount = sub.amount;
      switch (sub.billing_cycle) {
        case 'yearly': monthlyAmount = sub.amount / 12; break;
        case 'half_yearly': monthlyAmount = sub.amount / 6; break;
        case 'quarterly': monthlyAmount = sub.amount / 3; break;
        case 'weekly': monthlyAmount = sub.amount * 4.33; break;
        case 'daily': monthlyAmount = sub.amount * 30.44; break;
      }
      
      categories[category].count++;
      categories[category].amount += monthlyAmount;
      totalMonthlySpend += monthlyAmount;
    });
    
    // 基于用户行为生成推荐
    
    // 1. 套餐升级/降级建议
    if (totalMonthlySpend > 1000) {
      recommendations.push({
        type: 'bundle',
        title: '考虑企业套餐',
        description: '您的订阅支出较高，某些服务的企业套餐可能更划算',
        priority: 'high',
        actionable: true
      });
    }
    
    // 2. 类别平衡建议
    const dominantCategory = Object.entries(categories)
      .sort((a, b) => b[1].amount - a[1].amount)[0];
    
    if (dominantCategory && dominantCategory[1].amount / totalMonthlySpend > 0.5) {
      recommendations.push({
        type: 'balance',
        title: '订阅结构优化',
        description: `${dominantCategory[0]}类别占比过高，建议多样化订阅组合`,
        priority: 'medium',
        actionable: true
      });
    }
    
    // 3. 节省建议
    const monthlySubscriptions = subscriptions.filter(s => s.billing_cycle === 'monthly');
    if (monthlySubscriptions.length > 3) {
      recommendations.push({
        type: 'savings',
        title: '切换到年付计划',
        description: `您有${monthlySubscriptions.length}个月付订阅，改为年付可节省10-20%`,
        priority: 'medium',
        actionable: true,
        estimatedSavings: totalMonthlySpend * 0.15
      });
    }
    
    // 4. 免费替代方案
    const expensiveSubscriptions = subscriptions.filter(s => {
      let monthlyAmount = s.amount;
      switch (s.billing_cycle) {
        case 'yearly': monthlyAmount = s.amount / 12; break;
        case 'half_yearly': monthlyAmount = s.amount / 6; break;
        case 'quarterly': monthlyAmount = s.amount / 3; break;
      }
      return monthlyAmount > 200;
    });
    
    if (expensiveSubscriptions.length > 0) {
      recommendations.push({
        type: 'alternative',
        title: '寻找替代方案',
        description: '部分高价订阅可能有免费或更便宜的替代品',
        priority: 'low',
        actionable: true
      });
    }
    
    // 5. 试用期提醒
    const newSubscriptions = subscriptions.filter(s => 
      moment().diff(moment(s.start_date), 'days') < 30
    );
    
    if (newSubscriptions.length > 0) {
      recommendations.push({
        type: 'trial',
        title: '试用期评估',
        description: `您有${newSubscriptions.length}个新订阅，记得在试用期结束前评估是否继续`,
        priority: 'high',
        actionable: true
      });
    }
    
    res.json({
      recommendations,
      userProfile: {
        totalSubscriptions: subscriptions.length,
        monthlySpend: totalMonthlySpend,
        dominantCategory: dominantCategory ? dominantCategory[0] : null,
        spendingLevel: totalMonthlySpend < 500 ? 'low' : 
                      totalMonthlySpend < 1500 ? 'medium' : 'high'
      },
      insights: {
        savingsPotential: recommendations
          .filter(r => r.estimatedSavings)
          .reduce((sum, r) => sum + r.estimatedSavings, 0),
        actionableRecommendations: recommendations.filter(r => r.actionable).length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
