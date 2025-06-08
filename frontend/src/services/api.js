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

const apiService = {
  auth: authAPI,
  subscription: subscriptionAPI,
  statistics: statisticsAPI,
  notification: notificationAPI,
  llm: llmAPI,
  data: dataAPI,
};

export default apiService;