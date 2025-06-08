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
    
    // 更新订阅的cancelled_at字段
    const updatedSubscription = {
      ...subscription,
      cancelled_at: new Date().toISOString()
    };
    
    Subscription.updateByUser(subscriptionId, req.user.id, updatedSubscription, (updateErr, result) => {
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

module.exports = router;
