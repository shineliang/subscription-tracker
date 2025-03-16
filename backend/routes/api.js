const express = require('express');
const router = express.Router();
const Subscription = require('../models/subscription');
const Reminder = require('../models/reminder');
const NotificationSetting = require('../models/notificationSetting');
const axios = require('axios');
const moment = require('moment');

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
  Subscription.getSpendingByCategory((err, stats) => {
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
    
    const response = await axios.post('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      model: "qwen-max-latest",
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

module.exports = router;
