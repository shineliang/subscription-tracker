import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 订阅相关API
export const subscriptionAPI = {
  // 获取所有订阅
  getAll: () => api.get('/subscriptions'),
  
  // 获取单个订阅
  getById: (id) => api.get(`/subscriptions/${id}`),
  
  // 创建新订阅
  create: (data) => api.post('/subscriptions', data),
  
  // 更新订阅
  update: (id, data) => api.put(`/subscriptions/${id}`, data),
  
  // 删除订阅
  delete: (id) => api.delete(`/subscriptions/${id}`),
  
  // 获取即将到期的订阅
  getUpcoming: (days = 7) => api.get(`/subscriptions/upcoming/${days}`),
  
  // 续费订阅（延长下次付款日期一个周期）
  renew: (id) => api.post(`/subscriptions/${id}/renew`),
};

// 统计相关API
export const statisticsAPI = {
  // 获取每月花费
  getMonthlySpending: () => api.get('/statistics/monthly'),
  
  // 获取每年花费
  getYearlySpending: () => api.get('/statistics/yearly'),
  
  // 按类别获取花费
  getSpendingByCategory: (timeframe = 'monthly') => api.get(`/statistics/by-category?timeframe=${timeframe}`),
  
  // 获取月度趋势数据
  getMonthlyTrend: () => api.get('/statistics/monthly-trend'),
};

// 通知设置相关API
export const notificationAPI = {
  // 获取通知设置
  getSettings: () => api.get('/notification-settings'),
  
  // 更新通知设置
  updateSettings: (data) => api.put('/notification-settings', data),
};

// LLM解析API
export const llmAPI = {
  // 解析订阅信息
  parseSubscription: (description) => api.post('/parse-subscription', { description }),
};

export default {
  subscription: subscriptionAPI,
  statistics: statisticsAPI,
  notification: notificationAPI,
  llm: llmAPI,
};
