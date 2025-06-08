import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Loader from '../components/Loader';
import { subscriptionAPI } from '../services/api';
import { formatDate, getBillingCycleOptions, getCategoryOptions } from '../services/utils';

const EditSubscription = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    provider: '',
    amount: '',
    currency: 'CNY',
    billing_cycle: 'monthly',
    cycle_count: 1,
    start_date: '',
    next_payment_date: '',
    reminder_days: 7,
    category: '',
    active: true
  });
  
  const currencyOptions = [
    { value: 'CNY', label: '人民币 (¥)' },
    { value: 'USD', label: '美元 ($)' },
    { value: 'EUR', label: '欧元 (€)' },
    { value: 'GBP', label: '英镑 (£)' },
    { value: 'JPY', label: '日元 (¥)' },
  ];
  
  const reminderOptions = [
    { value: 1, label: '1天前' },
    { value: 3, label: '3天前' },
    { value: 5, label: '5天前' },
    { value: 7, label: '1周前' },
    { value: 14, label: '2周前' },
    { value: 30, label: '1个月前' },
  ];
  
  // 获取订阅详情
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setLoading(true);
        const response = await subscriptionAPI.getById(id);
        const subscription = response.data;
        
        // 格式化日期和数值
        setFormData({
          ...subscription,
          amount: subscription.amount.toString(),
          cycle_count: subscription.cycle_count.toString(),
          reminder_days: subscription.reminder_days.toString(),
          start_date: formatDate(subscription.start_date),
          next_payment_date: formatDate(subscription.next_payment_date),
        });
      } catch (error) {
        console.error('Error fetching subscription:', error);
        toast.error('获取订阅信息失败');
        navigate('/subscriptions');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubscription();
  }, [id, navigate]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    // 如果修改了开始日期和计费周期，自动计算下次付款日期
    if (name === 'start_date' || name === 'billing_cycle' || name === 'cycle_count') {
      calculateNextPaymentDate();
    }
  };
  
  // 安全的月份添加函数
  const addMonths = (date, months) => {
    const newDate = new Date(date);
    const day = newDate.getDate();
    newDate.setMonth(newDate.getMonth() + months);
    
    // 处理月末日期溢出
    if (newDate.getDate() !== day) {
      newDate.setDate(0); // 设置为上个月的最后一天
    }
    
    return newDate;
  };

  const calculateNextPaymentDate = () => {
    if (!formData.start_date) return;
    
    const startDate = new Date(formData.start_date);
    let nextDate = new Date(startDate);
    const cycleCount = Number(formData.cycle_count) || 1;
    
    switch (formData.billing_cycle) {
      case 'monthly':
        nextDate = addMonths(startDate, cycleCount);
        break;
      case 'yearly':
        nextDate = addMonths(startDate, 12 * cycleCount);
        break;
      case 'half_yearly':
        nextDate = addMonths(startDate, 6 * cycleCount);
        break;
      case 'quarterly':
        nextDate = addMonths(startDate, 3 * cycleCount);
        break;
      case 'weekly':
        nextDate.setDate(startDate.getDate() + (7 * cycleCount));
        break;
      case 'daily':
        nextDate.setDate(startDate.getDate() + cycleCount);
        break;
      default:
        nextDate = startDate;
    }
    
    setFormData((prev) => ({
      ...prev,
      next_payment_date: formatDate(nextDate),
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      // 验证和转换数值
      const amount = parseFloat(formData.amount);
      const cycleCount = parseInt(formData.cycle_count) || 1;
      const reminderDays = parseInt(formData.reminder_days) || 7;
      
      if (isNaN(amount) || amount <= 0) {
        toast.error('请输入有效的金额');
        setSaving(false);
        return;
      }
      
      const formattedData = {
        ...formData,
        amount: amount,
        cycle_count: cycleCount,
        reminder_days: reminderDays,
      };
      
      await subscriptionAPI.update(id, formattedData);
      toast.success('订阅更新成功');
      navigate('/subscriptions');
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('更新失败，请检查表单并重试');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <Loader />;
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-dark-600 dark:text-white mb-6">编辑订阅</h1>
      
      {/* 订阅表单 */}
      <div className="bg-white dark:bg-dark-700 rounded-lg shadow-md p-6 border border-gray-100 dark:border-dark-600">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 基本信息 */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-lg font-medium text-dark-600 dark:text-white">基本信息</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  订阅名称 *
                </label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  placeholder="例如: Netflix、Spotify、iCloud..."
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  提供商
                </label>
                <input
                  type="text"
                  name="provider"
                  className="form-input"
                  placeholder="例如: Netflix, Inc.、Apple、Adobe..."
                  value={formData.provider}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  描述
                </label>
                <textarea
                  name="description"
                  className="form-input h-20 resize-none"
                  placeholder="添加有关此订阅的详细信息..."
                  value={formData.description}
                  onChange={handleChange}
                ></textarea>
              </div>
            </div>
            
            {/* 付款信息 */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-lg font-medium text-dark-600 dark:text-white">付款信息</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    金额 *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      name="amount"
                      className="form-input pr-12"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={formData.amount}
                      onChange={handleChange}
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center">
                      <select
                        name="currency"
                        className="h-full py-0 pl-2 pr-7 border-transparent bg-transparent text-gray-500 dark:text-gray-300 sm:text-sm rounded-md focus:ring-0 focus:border-transparent"
                        value={formData.currency}
                        onChange={handleChange}
                      >
                        {currencyOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.value}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    类别
                  </label>
                  <select
                    name="category"
                    className="form-select"
                    value={formData.category}
                    onChange={handleChange}
                  >
                    <option value="">选择类别...</option>
                    {getCategoryOptions().map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    计费周期 *
                  </label>
                  <select
                    name="billing_cycle"
                    className="form-select"
                    value={formData.billing_cycle}
                    onChange={handleChange}
                    required
                  >
                    {getBillingCycleOptions().map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    周期次数
                  </label>
                  <input
                    type="number"
                    name="cycle_count"
                    className="form-input"
                    placeholder="1"
                    min="1"
                    step="1"
                    value={formData.cycle_count}
                    onChange={handleChange}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    例如: 每2个月付款一次，输入2
                  </p>
                </div>
              </div>
            </div>
            
            {/* 日期信息 */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-lg font-medium text-dark-600 dark:text-white">日期信息</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    开始日期 *
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    className="form-input"
                    value={formData.start_date}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    下次付款日期 *
                  </label>
                  <input
                    type="date"
                    name="next_payment_date"
                    className="form-input"
                    value={formData.next_payment_date}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    提醒提前天数
                  </label>
                  <select
                    name="reminder_days"
                    className="form-select"
                    value={formData.reminder_days}
                    onChange={handleChange}
                  >
                    {reminderOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center h-full pt-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="active"
                      className="form-checkbox"
                      checked={formData.active}
                      onChange={handleChange}
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">活跃订阅</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end space-x-3">
            <button
              type="button"
              className="btn-outline"
              onClick={() => navigate('/subscriptions')}
              disabled={saving}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? '保存中...' : '保存更改'}
            </button>
          </div>
        </form>
      </div>
      
      {saving && <Loader fullScreen />}
    </div>
  );
};

export default EditSubscription;
