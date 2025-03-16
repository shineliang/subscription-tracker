import { format, addMonths, addYears, addWeeks, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 日期格式化
export const formatDate = (date, formatStr = 'yyyy-MM-dd') => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: zhCN });
};

// 计算下一个付款日期
export const calculateNextPaymentDate = (startDate, billingCycle, cycleCount = 1) => {
  if (!startDate) return '';
  
  const date = new Date(startDate);
  
  switch (billingCycle) {
    case 'monthly':
      return addMonths(date, cycleCount);
    case 'yearly':
      return addYears(date, cycleCount);
    case 'half_yearly':
      return addMonths(date, 6 * cycleCount);
    case 'quarterly':
      return addMonths(date, 3 * cycleCount);
    case 'weekly':
      return addWeeks(date, cycleCount);
    case 'daily':
      return addDays(date, cycleCount);
    default:
      return date;
  }
};

// 货币格式化
export const formatCurrency = (amount, currency = 'CNY', options = {}) => {
  if (amount === undefined || amount === null) return '';
  
  const formatter = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: options.minimumFractionDigits || 2,
    maximumFractionDigits: options.maximumFractionDigits || 2,
    ...options,
  });
  
  return formatter.format(amount);
};

// 计费周期格式化
export const formatBillingCycle = (cycle, count = 1) => {
  if (!cycle) return '';
  
  const cycleMap = {
    monthly: count === 1 ? '每月' : `每${count}个月`,
    yearly: count === 1 ? '每年' : `每${count}年`,
    half_yearly: count === 1 ? '每半年' : `每${count}个半年`,
    quarterly: count === 1 ? '每季度' : `每${count}个季度`,
    weekly: count === 1 ? '每周' : `每${count}周`,
    daily: count === 1 ? '每天' : `每${count}天`,
  };
  
  return cycleMap[cycle] || cycle;
};

// 计算距离日期还有多少天
export const daysUntil = (date) => {
  if (!date) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// 根据天数返回提醒状态
export const getReminderStatus = (days) => {
  if (days < 0) return 'expired';
  if (days === 0) return 'today';
  if (days <= 3) return 'soon';
  if (days <= 7) return 'upcoming';
  return 'safe';
};

// 获取提醒状态对应的CSS类
export const getReminderStatusClass = (status) => {
  const statusClasses = {
    expired: 'bg-red-100 text-red-800',
    today: 'bg-yellow-100 text-yellow-800',
    soon: 'bg-orange-100 text-orange-800',
    upcoming: 'bg-blue-100 text-blue-800',
    safe: 'bg-green-100 text-green-800',
  };
  
  return statusClasses[status] || 'bg-gray-100 text-gray-800';
};

// 获取提醒状态对应的文本
export const getReminderStatusText = (status) => {
  const statusTexts = {
    expired: '已过期',
    today: '今天到期',
    soon: '即将到期',
    upcoming: '快要到期',
    safe: '安全',
  };
  
  return statusTexts[status] || '未知';
};

// 获取比较完整的日期描述
export const getDateDescription = (date) => {
  const days = daysUntil(date);
  
  if (days < 0) {
    return `已过期${Math.abs(days)}天`;
  }
  
  if (days === 0) {
    return '今天到期';
  }
  
  return `${days}天后到期`;
};

// 获取周期类型选项
export const getBillingCycleOptions = () => [
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每季度' },
  { value: 'half_yearly', label: '每半年' },
  { value: 'yearly', label: '每年' },
  { value: 'weekly', label: '每周' },
  { value: 'daily', label: '每天' },
];

// 随机生成颜色
export const getRandomColor = (index = null) => {
  const colors = [
    '#0EA5E9', // primary-500
    '#10B981', // secondary-500
    '#D946EF', // accent-500
    '#F59E0B', // amber-500
    '#EC4899', // pink-500
    '#8B5CF6', // violet-500
    '#14B8A6', // teal-500
    '#F43F5E', // rose-500
    '#6366F1', // indigo-500
    '#84CC16', // lime-500
  ];
  
  if (index !== null) {
    return colors[index % colors.length];
  }
  
  return colors[Math.floor(Math.random() * colors.length)];
};

// 获取类别选项
export const getCategoryOptions = () => [
  { value: '软件', label: '软件' },
  { value: '音乐', label: '音乐' },
  { value: '视频', label: '视频' },
  { value: '云存储', label: '云存储' },
  { value: '游戏', label: '游戏' },
  { value: '教育', label: '教育' },
  { value: '新闻', label: '新闻' },
  { value: '工具', label: '工具' },
  { value: '健康', label: '健康' },
  { value: '其他', label: '其他' },
];
