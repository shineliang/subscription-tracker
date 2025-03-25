const express = require('express');
const router = express.Router();
const Subscription = require('../models/subscription');
const Reminder = require('../models/reminder');
const NotificationSetting = require('../models/notificationSetting');
const axios = require('axios');
const moment = require('moment');
const { Parser } = require('json2csv');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');
const { parse } = require('csv-parse');

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
router.get('/subscriptions', (req, res) => {
  Subscription.getAll((err, subscriptions) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(subscriptions);
  });
});

// 获取单个订阅
router.get('/subscriptions/:id', (req, res) => {
  Subscription.getById(req.params.id, (err, subscription) => {
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
router.post('/subscriptions', (req, res) => {
  const subscription = req.body;
  
  // 验证必需字段
  if (!subscription.name || !subscription.amount || !subscription.billing_cycle || !subscription.start_date) {
    return res.status(400).json({ error: '缺少必要的字段' });
  }

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
router.put('/subscriptions/:id', (req, res) => {
  const subscription = req.body;
  
  Subscription.update(req.params.id, subscription, (err, updatedSubscription) => {
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
router.delete('/subscriptions/:id', (req, res) => {
  Subscription.delete(req.params.id, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

// 获取即将到期的订阅
router.get('/subscriptions/upcoming/:days', (req, res) => {
  const days = parseInt(req.params.days) || 7;
  
  Subscription.getUpcoming(days, (err, subscriptions) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(subscriptions);
  });
});

// 获取每月花费
router.get('/statistics/monthly', (req, res) => {
  Subscription.getMonthlySpending((err, stats) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(stats);
  });
});

// 获取每年花费
router.get('/statistics/yearly', (req, res) => {
  Subscription.getYearlySpending((err, stats) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(stats);
  });
});

// 按类别获取花费
router.get('/statistics/by-category', (req, res) => {
  const timeframe = req.query.timeframe || 'monthly';
  Subscription.getSpendingByCategory(timeframe, (err, stats) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(stats);
  });
});

// 获取月度趋势数据
router.get('/statistics/monthly-trend', (req, res) => {
  Subscription.getMonthlyTrend((err, stats) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(stats);
  });
});

// 获取通知设置
router.get('/notification-settings', (req, res) => {
  NotificationSetting.get((err, settings) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(settings);
  });
});

// 更新通知设置
router.put('/notification-settings', (req, res) => {
  const settings = req.body;
  
  NotificationSetting.update(settings, (err, updatedSettings) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(updatedSettings);
  });
});

// LLM API整合 - 解析订阅信息
router.post('/parse-subscription', async (req, res) => {
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
router.get('/export-data', async (req, res) => {
  try {
    // 获取所有订阅数据
    Subscription.getAll((err, subscriptions) => {
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
router.post('/import-data', upload.single('file'), (req, res) => {
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

    // 创建解析器流
    parser.on('readable', function() {
      let record;
      while ((record = parser.read()) !== null) {
        // 移除id字段，因为这是新导入的数据
        delete record.id;
        // 移除created_at和updated_at字段，让数据库自动生成
        delete record.created_at;
        delete record.updated_at;
        
        // 处理数值类型
        if (record.amount) {
          record.amount = parseFloat(record.amount);
        }
        if (record.reminder_days) {
          record.reminder_days = parseInt(record.reminder_days);
        }
        if (record.cycle_count) {
          record.cycle_count = parseInt(record.cycle_count);
        }
        if (record.active !== undefined) {
          record.active = parseInt(record.active);
        }
        
        records.push(record);
      }
    });

    // 处理解析完成
    parser.on('end', async function() {
      // 使用Promise.all处理所有导入
      const importPromises = records.map(subscription => {
        return new Promise((resolve) => {
          const processedSubscription = extract_subscription_info(subscription);
          Subscription.create(processedSubscription, (err) => {
            if (err) {
              console.error('导入订阅失败:', err);
              errorCount++;
            } else {
              successCount++;
            }
            resolve();
          });
        });
      });

      await Promise.all(importPromises);

      // 删除临时文件
      fs.unlinkSync(req.file.path);

      res.json({
        message: '导入完成',
        total: records.length,
        success: successCount,
        error: errorCount
      });
    });

    // 处理解析错误
    parser.on('error', function(err) {
      console.error('解析CSV文件失败:', err);
      // 如果文件存在，删除临时文件
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: '解析CSV文件失败' });
    });

    // 开始解析文件
    fs.createReadStream(req.file.path).pipe(parser);

  } catch (error) {
    console.error('导入数据失败:', error);
    // 如果文件存在，删除临时文件
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
