import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { 
  PaperAirplaneIcon,
  SparklesIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import Loader from '../components/Loader';
import { subscriptionAPI, llmAPI } from '../services/api';
import { formatDate, getBillingCycleOptions, getCategoryOptions } from '../services/utils';

const AddSubscription = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    provider: '',
    amount: '',
    currency: 'CNY',
    billing_cycle: 'monthly',
    cycle_count: 1,
    start_date: formatDate(new Date()),
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
  
  const calculateNextPaymentDate = () => {
    if (!formData.start_date) return;
    
    const startDate = new Date(formData.start_date);
    let nextDate = new Date(startDate);
    
    switch (formData.billing_cycle) {
      case 'monthly':
        nextDate.setMonth(startDate.getMonth() + Number(formData.cycle_count));
        break;
      case 'yearly':
        nextDate.setFullYear(startDate.getFullYear() + Number(formData.cycle_count));
        break;
      case 'quarterly':
        nextDate.setMonth(startDate.getMonth() + (3 * Number(formData.cycle_count)));
        break;
      case 'weekly':
        nextDate.setDate(startDate.getDate() + (7 * Number(formData.cycle_count)));
        break;
      case 'daily':
        nextDate.setDate(startDate.getDate() + Number(formData.cycle_count));
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
      setLoading(true);
      
      // 确保金额是数字
      const formattedData = {
        ...formData,
        amount: parseFloat(formData.amount),
        cycle_count: parseInt(formData.cycle_count),
        reminder_days: parseInt(formData.reminder_days),
      };
      
      await subscriptionAPI.create(formattedData);
      toast.success('订阅添加成功');
      navigate('/subscriptions');
    } catch (error) {
      console.error('Error adding subscription:', error);
      toast.error('添加失败，请检查表单并重试');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAiParse = async () => {
    if (!aiDescription.trim()) {
      toast.warning('请输入订阅描述');
      return;
    }
    
    try {
      setAiLoading(true);
      const response = await llmAPI.parseSubscription(aiDescription);
      const parsedData = response.data;
      
      // 更新表单数据
      setFormData((prev) => ({
        ...prev,
        ...parsedData,
        amount: parsedData.amount.toString(),
        cycle_count: parsedData.cycle_count?.toString() || '1',
        reminder_days: parsedData.reminder_days?.toString() || '7',
      }));
      
      toast.success('AI成功解析您的订阅信息');
    } catch (error) {
      console.error('Error parsing subscription with AI:', error);
      toast.error('AI解析失败，请手动填写表单');
    } finally {
      setAiLoading(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-dark-600 dark:text-white mb-6">添加新订阅</h1>
      
      {/* AI解析模块 */}
      <motion.div 
        className="bg-white dark:bg-dark-700 rounded-lg shadow-md p-6 mb-8 border border-gray-100 dark:border-dark-600"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center mb-4">
          <SparklesIcon className="h-6 w-6 text-accent-500 mr-2" />
          <h2 className="text-lg font-semibold text-dark-600 dark:text-white">AI 快速添加</h2>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          描述您的订阅，AI将自动为您填写表单。例如：<br />
          "我每月支付Netflix会员89元，从今天开始" 或 "我订阅了Adobe年费888元，刚刚付款"
        </p>
        
        <div className="flex space-x-3">
          <div className="flex-1">
            <textarea
              className="form-input h-24 resize-none"
              placeholder="描述您的订阅..."
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              disabled={aiLoading}
            ></textarea>
          </div>
          <div>
            <button
              type="button"
              className="btn-accent h-24 px-6"
              onClick={handleAiParse}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : (
                <PaperAirplaneIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
      
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
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? '保存中...' : '保存订阅'}
            </button>
          </div>
        </form>
      </div>
      
      {loading && <Loader fullScreen />}
    </div>
  );
};

export default AddSubscription;
