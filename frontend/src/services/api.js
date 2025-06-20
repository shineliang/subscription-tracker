import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

// 创建axios实例
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证token
api.interceptors.request.use(
  (config) => {
    // 从localStorage或sessionStorage获取token
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理认证错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // token过期或无效，清除本地存储并跳转到登录页
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      
      // 如果不是在登录或注册页面，则跳转到登录页
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// 认证相关API
export const authAPI = {
  // 用户注册
  register: (data) => api.post('/auth/register', data),
  
  // 用户登录
  login: (data) => api.post('/auth/login', data),
  
  // 刷新token
  refreshToken: () => api.post('/auth/refresh'),
  
  // 获取当前用户信息
  getCurrentUser: () => api.get('/auth/me'),
  
  // 更新用户信息
  updateProfile: (data) => api.put('/auth/me', data),
  
  // 修改密码
  changePassword: (data) => api.put('/auth/change-password', data),
  
  // 登出
  logout: () => api.post('/auth/logout'),
};

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
  
  // 取消订阅（订阅周期结束后不再续费）
  cancel: (id) => api.post(`/subscriptions/${id}/cancel`),
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

// 导入导出API
export const dataAPI = {
  // 导出数据
  exportData: () => api.get('/export-data', { responseType: 'blob' }),
  
  // 导入数据
  importData: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/import-data', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// 预算管理相关API
export const budgetAPI = {
  // 获取所有预算
  getAll: () => api.get('/budgets'),
  
  // 获取单个预算
  getById: (id) => api.get(`/budgets/${id}`),
  
  // 创建新预算
  create: (data) => api.post('/budgets', data),
  
  // 更新预算
  update: (id, data) => api.put(`/budgets/${id}`, data),
  
  // 删除预算
  delete: (id) => api.delete(`/budgets/${id}`),
  
  // 获取单个预算使用情况
  getUsage: (id) => api.get(`/budgets/${id}/usage`),
  
  // 获取所有预算使用情况
  getAllUsage: () => api.get('/budgets-usage'),
  
  // 检查并创建预算警告
  checkAlerts: () => api.post('/budgets/check-alerts'),
  
  // 获取未读预算警告
  getUnreadAlerts: () => api.get('/budget-alerts'),
  
  // 标记预算警告为已读
  markAlertsAsRead: (alertIds) => api.put('/budget-alerts/mark-read', { alertIds }),
};

// 历史记录相关API
export const historyAPI = {
  // 订阅历史
  subscription: {
    // 获取某个订阅的历史记录
    getBySubscriptionId: (subscriptionId) => api.get(`/subscriptions/${subscriptionId}/history`),
    
    // 获取所有订阅历史
    getAll: (limit = 100, offset = 0) => api.get(`/subscription-history?limit=${limit}&offset=${offset}`),
  },
  
  // 付款历史
  payment: {
    // 记录付款
    record: (paymentData) => api.post('/payments', paymentData),
    
    // 获取某个订阅的付款历史
    getBySubscriptionId: (subscriptionId) => api.get(`/subscriptions/${subscriptionId}/payments`),
    
    // 获取所有付款历史
    getAll: (limit = 100, offset = 0) => api.get(`/payments?limit=${limit}&offset=${offset}`),
    
    // 获取指定时间段的付款历史
    getByDateRange: (startDate, endDate) => 
      api.get(`/payments/date-range?start_date=${startDate}&end_date=${endDate}`),
    
    // 获取付款统计
    getStats: (year) => api.get(`/payments/stats/${year}`),
  },
};

const apiService = {
  auth: authAPI,
  subscription: subscriptionAPI,
  statistics: statisticsAPI,
  notification: notificationAPI,
  llm: llmAPI,
  data: dataAPI,
  history: historyAPI,
};

export default apiService;