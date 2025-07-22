const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const moment = require('moment'); // 添加 moment 库的导入
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const Reminder = require('./models/reminder');
const NotificationSetting = require('./models/notificationSetting');
const Subscription = require('./models/subscription');
const errorHandler = require('./middleware/errorHandler');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5200;

// 中间件
app.use(cors());
app.use(express.json());

// API路由
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// 处理生产环境下的静态资源
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// 404处理 - 针对API路由
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: '未找到API路径' });
});

// 全局错误处理中间件
app.use(errorHandler);

// 定时任务 - 每天检查需要发送的提醒
cron.schedule('0 9 * * *', async () => {
  console.log('运行提醒检查定时任务...');
  
  try {
    // 将回调转换为Promise
    const reminders = await new Promise((resolve, reject) => {
      Reminder.getPendingReminders((err, data) => err ? reject(err) : resolve(data));
    });
    
    // 获取已过期但未续费的订阅
    const today = moment().format('YYYY-MM-DD');
    let expiredSubscriptions = [];
    
    try {
      expiredSubscriptions = await new Promise((resolve, reject) => {
        Subscription.getExpired((err, data) => err ? reject(err) : resolve(data || []));
      });
    } catch (expiredErr) {
      console.error('获取已过期订阅失败:', expiredErr);
      // 继续处理常规提醒
    }
    
    // 合并常规提醒和过期提醒
    let allReminders = [...reminders];
    
    if (expiredSubscriptions.length > 0) {
      // 将过期订阅转换为提醒格式
      const expiredReminders = expiredSubscriptions.map(subscription => ({
        id: `expired-${subscription.id}`,
        subscription_id: subscription.id,
        name: subscription.name,
        amount: subscription.amount,
        currency: subscription.currency,
        next_payment_date: subscription.next_payment_date,
        isExpired: true, // 标记为已过期
        daysOverdue: moment(today).diff(moment(subscription.next_payment_date), 'days')
      }));
      
      allReminders = [...allReminders, ...expiredReminders];
    }
    
    if (allReminders.length === 0) {
      return console.log('没有需要发送的提醒');
    }
    
    // 获取通知设置
    const settings = await new Promise((resolve, reject) => {
      NotificationSetting.get((err, data) => err ? reject(err) : resolve(data));
    });
    
    // 如果启用了邮件通知并设置了邮箱
    if (settings.email_notifications && settings.email) {
      const emailSent = await sendEmailReminders(settings.email, allReminders);
      
      // 仅在邮件发送成功后标记常规提醒为已发送
      if (emailSent) {
        const markPromises = reminders.map(reminder => 
          new Promise((resolve) => {
            Reminder.markAsSent(reminder.id, (err) => {
              if (err) {
                console.error(`标记提醒 ${reminder.id} 为已发送失败:`, err);
              }
              resolve(); // 即使失败也继续
            });
          })
        );
        
        await Promise.allSettled(markPromises);
      } else {
        console.error('邮件发送失败，提醒未标记为已发送');
      }
    }
  } catch (error) {
    console.error('定时任务执行失败:', error);
    // 可以在这里添加错误通知机制，如发送管理员邮件
  }
});

// 发送提醒邮件的函数
async function sendEmailReminders(email, reminders) {
  // 检查邮件配置
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('邮件配置不完整，请在.env文件中设置EMAIL_USER和EMAIL_PASS');
    return false;
  }
  
  try {
    // 设置邮件服务配置
    const transporter = nodemailer.createTransport({
      service: 'qq',  // 使用您选择的邮件服务
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    // 分离常规提醒和已过期提醒
    const upcomingReminders = reminders.filter(r => !r.isExpired);
    const expiredReminders = reminders.filter(r => r.isExpired);
    
    // 构建邮件内容
    let htmlContent = `<h2>订阅管理提醒</h2>`;
    
    // 添加即将到期的订阅
    if (upcomingReminders.length > 0) {
      htmlContent += `
        <h3>即将到期的订阅：</h3>
        <ul>
          ${upcomingReminders.map(reminder => `
            <li>
              <strong>${reminder.name}</strong> - 
              金额: ${reminder.amount} ${reminder.currency} - 
              到期日期: ${reminder.next_payment_date}
            </li>
          `).join('')}
        </ul>
      `;
    }
    
    // 添加已过期的订阅
    if (expiredReminders.length > 0) {
      htmlContent += `
        <h3>已过期的订阅：</h3>
        <ul>
          ${expiredReminders.map(reminder => `
            <li>
              <strong>${reminder.name}</strong> - 
              金额: ${reminder.amount} ${reminder.currency} - 
              已过期: ${reminder.daysOverdue}天
            </li>
          `).join('')}
        </ul>
        <p><strong>请注意：</strong> 过期订阅需要及时处理，您可以登录系统续费或取消这些订阅。</p>
      `;
    }
    
    htmlContent += `<p>请登录订阅管理系统查看详情或更新订阅信息。</p>`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '订阅管理通知 - ' + (expiredReminders.length > 0 ? '有订阅已过期' : '订阅即将到期'),
      html: htmlContent
    };
    
    // 发送邮件
    const info = await transporter.sendMail(mailOptions);
    console.log('提醒邮件已发送:', info.response);
    return true;
  } catch (error) {
    console.error('发送提醒邮件失败:', error);
    return false;
  }
}

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`
===================================
  订阅管家服务器启动成功！
  运行模式: ${process.env.NODE_ENV || '开发模式'}
  端口: ${PORT}
  启动时间: ${new Date().toLocaleString()}
===================================
  `);
});

// 导入数据库实例以便关闭
const db = require('./db/database');

// 优雅退出处理
const gracefulShutdown = async (signal) => {
  console.log(`\n收到${signal}信号，开始优雅关闭...`);
  
  // 停止接受新请求
  server.close(async () => {
    try {
      // 关闭数据库连接
      if (db && db.close) {
        await db.close();
        console.log('数据库连接已关闭');
      }
      
      // 清理其他资源
      console.log('服务器优雅关闭完成');
      process.exit(0);
    } catch (error) {
      console.error('关闭过程中出错:', error);
      process.exit(1);
    }
  });
  
  // 30秒后强制退出
  setTimeout(() => {
    console.error('无法优雅关闭，强制退出');
    process.exit(1);
  }, 30000);
};

// 移除之前的监听器（如果有的话）
process.removeAllListeners('SIGTERM');
process.removeAllListeners('SIGINT');

// 添加新的监听器
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.once('SIGINT', () => gracefulShutdown('SIGINT'));

// 增加最大监听器限制
server.setMaxListeners(20);
