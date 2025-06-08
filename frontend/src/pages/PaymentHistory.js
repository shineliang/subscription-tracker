import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { 
  CurrencyDollarIcon, 
  CalendarIcon,
  FunnelIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { historyAPI, dataAPI } from '../services/api';
import { toast } from 'react-toastify';
import EmptyState from '../components/EmptyState';

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: '',
    subscription: ''
  });
  const [stats, setStats] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, [filters.year]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      let response;
      if (filters.month) {
        const startDate = `${filters.year}-${filters.month.padStart(2, '0')}-01`;
        const endDate = `${filters.year}-${filters.month.padStart(2, '0')}-31`;
        response = await historyAPI.payment.getByDateRange(startDate, endDate);
      } else {
        response = await historyAPI.payment.getByDateRange(`${filters.year}-01-01`, `${filters.year}-12-31`);
      }
      
      let filteredPayments = response.data;
      if (filters.subscription) {
        filteredPayments = filteredPayments.filter(p => p.subscription_id === parseInt(filters.subscription));
      }
      
      setPayments(filteredPayments);
      
      // Extract unique subscriptions for filter
      const uniqueSubs = [...new Map(response.data.map(p => [p.subscription_id, {
        id: p.subscription_id,
        name: p.subscription_name
      }])).values()];
      setSubscriptions(uniqueSubs);
    } catch (error) {
      console.error('获取付款历史失败:', error);
      toast.error('加载付款历史失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await historyAPI.payment.getStats(filters.year);
      setStats(response.data);
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await dataAPI.exportData();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payments_${filters.year}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败');
    }
  };

  const calculateTotalAmount = () => {
    return payments.reduce((sum, payment) => {
      if (payment.currency === 'CNY') {
        return sum + parseFloat(payment.amount);
      }
      return sum + (parseFloat(payment.amount) * 7); // Simple conversion
    }, 0);
  };

  const groupPaymentsByMonth = () => {
    const grouped = {};
    payments.forEach(payment => {
      const month = format(new Date(payment.payment_date), 'yyyy-MM');
      if (!grouped[month]) {
        grouped[month] = [];
      }
      grouped[month].push(payment);
    });
    return grouped;
  };

  const paymentMethods = {
    '支付宝': 'text-blue-600 bg-blue-100',
    '微信': 'text-green-600 bg-green-100',
    '信用卡': 'text-purple-600 bg-purple-100',
    '银行转账': 'text-orange-600 bg-orange-100',
    '其他': 'text-gray-600 bg-gray-100'
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const groupedPayments = groupPaymentsByMonth();
  const totalAmount = calculateTotalAmount();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-900 dark:text-white flex items-center">
          <CurrencyDollarIcon className="h-7 w-7 mr-2" />
          付款历史
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          查看和管理您的订阅付款记录
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium">筛选:</span>
          </div>
          
          <select
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
            className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            {[2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}年</option>
            ))}
          </select>
          
          <select
            value={filters.month}
            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="">全部月份</option>
            {[...Array(12)].map((_, i) => (
              <option key={i} value={i + 1}>{i + 1}月</option>
            ))}
          </select>
          
          <select
            value={filters.subscription}
            onChange={(e) => setFilters({ ...filters, subscription: e.target.value })}
            className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="">全部订阅</option>
            {subscriptions.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>
          
          <div className="ml-auto">
            <button
              onClick={handleExport}
              className="px-4 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center space-x-2 text-sm"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              <span>导出</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6"
        >
          <p className="text-sm text-gray-500 mb-1">总付款次数</p>
          <p className="text-2xl font-bold text-dark-900 dark:text-white">
            {payments.length}
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6"
        >
          <p className="text-sm text-gray-500 mb-1">总付款金额</p>
          <p className="text-2xl font-bold text-primary-600">
            ¥{totalAmount.toFixed(2)}
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6"
        >
          <p className="text-sm text-gray-500 mb-1">平均每月</p>
          <p className="text-2xl font-bold text-dark-900 dark:text-white">
            ¥{(totalAmount / (filters.month ? 1 : 12)).toFixed(2)}
          </p>
        </motion.div>
      </div>

      {/* Payment List */}
      {payments.length === 0 ? (
        <EmptyState
          icon={CurrencyDollarIcon}
          title="暂无付款记录"
          description="您还没有任何付款记录"
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPayments).sort((a, b) => b[0].localeCompare(a[0])).map(([month, monthPayments]) => {
            const monthTotal = monthPayments.reduce((sum, p) => {
              return sum + (p.currency === 'CNY' ? parseFloat(p.amount) : parseFloat(p.amount) * 7);
            }, 0);
            
            return (
              <div key={month} className="bg-white dark:bg-dark-800 rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 dark:bg-dark-700 border-b border-gray-200 dark:border-dark-600">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-dark-900 dark:text-white">
                      {format(new Date(month + '-01'), 'yyyy年MM月', { locale: zhCN })}
                    </h3>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      共 {monthPayments.length} 笔，合计 ¥{monthTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-200 dark:divide-dark-600">
                  {monthPayments.map(payment => (
                    <div key={payment.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-dark-700">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-medium text-dark-900 dark:text-white">
                              {payment.subscription_name}
                            </h4>
                            {payment.payment_method && (
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                paymentMethods[payment.payment_method] || paymentMethods['其他']
                              }`}>
                                {payment.payment_method}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-gray-500 flex items-center space-x-3">
                            <span className="flex items-center">
                              <CalendarIcon className="h-4 w-4 mr-1" />
                              {format(new Date(payment.payment_date), 'MM月dd日', { locale: zhCN })}
                            </span>
                            {payment.notes && (
                              <span className="text-gray-400">• {payment.notes}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-dark-900 dark:text-white">
                            {payment.currency} {payment.amount}
                          </p>
                          {payment.status !== 'completed' && (
                            <span className={`text-xs ${
                              payment.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {payment.status === 'pending' ? '待付款' : '失败'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;