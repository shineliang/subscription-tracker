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
      setLoading(true);
      
      // 验证和转换数值
      const amount = parseFloat(formData.amount);
      const cycleCount = parseInt(formData.cycle_count) || 1;
      const reminderDays = parseInt(formData.reminder_days) || 7;
      
      if (isNaN(amount) || amount <= 0) {
        toast.error('请输入有效的金额');
        setLoading(false);
        return;
      }
      
      const formattedData = {
        ...formData,
        amount: amount,
        cycle_count: cycleCount,
        reminder_days: reminderDays,
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-dark-600 dark:text-white mb-8">添加新订阅</h1>
      
      {/* AI解析模块 */}
      <motion.div 
        className="bg-white dark:bg-dark-700 rounded-xl shadow-lg p-6 sm:p-8 mb-8 border border-gray-100 dark:border-dark-600"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center mb-4">
          <SparklesIcon className="h-6 w-6 text-accent-500 mr-2" />
          <h2 className="text-lg font-semibold text-dark-600 dark:text-white">AI 快速添加</h2>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          描述您的订阅，AI将自动为您填写表单。例如：<br />
          "我每月支付Netflix会员89元，从今天开始" 或 "我订阅了Adobe年费888元，刚刚付款"
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <textarea
              className="form-input h-28 resize-none text-base w-full"
              placeholder="我每月支付Netflix会员89元，从今天开始"
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              disabled={aiLoading}
            ></textarea>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              className="btn-accent w-full h-28 px-6 py-4 flex flex-col items-center justify-center space-y-2"
              onClick={handleAiParse}
              disabled={aiLoading || !aiDescription.trim()}
            >
              {aiLoading ? (
                <>
                  <ArrowPathIcon className="h-6 w-6 animate-spin" />
                  <span className="text-sm font-medium">AI解析中...</span>
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="h-6 w-6" />
                  <span className="text-sm font-medium">开始解析</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* 快速示例 */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">快速填充:</span>
          {[
            "Netflix会员每月89元",
            "Adobe年费订阅888元", 
            "Spotify Premium月费15元",
            "iCloud存储月费6元"
          ].map((example, index) => (
            <button
              key={index}
              type="button"
              className="text-xs px-3 py-1 bg-gray-100 dark:bg-dark-600 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-dark-500 transition-colors"
              onClick={() => setAiDescription(example)}
              disabled={aiLoading}
            >
              {example}
            </button>
          ))}
        </div>
      </motion.div>
      
      {/* 订阅表单 */}
      <div className="bg-white dark:bg-dark-700 rounded-xl shadow-lg p-6 sm:p-8 border border-gray-100 dark:border-dark-600">
        <form onSubmit={handleSubmit}>
          <div className="space-y-8">
            {/* 基本信息 */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-dark-600 dark:text-white border-b border-gray-200 dark:border-dark-600 pb-2">基本信息</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    订阅名称 *
                  </label>
                  <input
                    type="text"
                    name="name"
                    className="form-input text-base"
                    placeholder="例如: Netflix、Spotify、iCloud..."
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    提供商
                  </label>
                  <input
                    type="text"
                    name="provider"
                    className="form-input text-base"
                    placeholder="例如: Netflix, Inc.、Apple、Adobe..."
                    value={formData.provider}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  描述
                </label>
                <textarea
                  name="description"
                  className="form-input h-24 resize-none text-base"
                  placeholder="添加有关此订阅的详细信息..."
                  value={formData.description}
                  onChange={handleChange}
                ></textarea>
              </div>
            </div>
            
            {/* 付款信息 */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-dark-600 dark:text-white border-b border-gray-200 dark:border-dark-600 pb-2">付款信息</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    金额 *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="amount"
                      className="form-input pr-20 text-base"
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
                        className="h-full py-0 pl-3 pr-8 border-transparent bg-transparent text-gray-500 dark:text-gray-300 text-sm rounded-md focus:ring-0 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    类别
                  </label>
                  <select
                    name="category"
                    className="form-select text-base"
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
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    计费周期 *
                  </label>
                  <select
                    name="billing_cycle"
                    className="form-select text-base"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    周期次数
                  </label>
                  <input
                    type="number"
                    name="cycle_count"
                    className="form-input text-base"
                    placeholder="1"
                    min="1"
                    step="1"
                    value={formData.cycle_count}
                    onChange={handleChange}
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    例如: 每2个月付款一次，输入2
                  </p>
                </div>
              </div>
            </div>
            
            {/* 日期信息 */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-dark-600 dark:text-white border-b border-gray-200 dark:border-dark-600 pb-2">日期信息</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    开始日期 *
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    className="form-input text-base"
                    value={formData.start_date}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    下次付款日期 *
                  </label>
                  <input
                    type="date"
                    name="next_payment_date"
                    className="form-input text-base"
                    value={formData.next_payment_date}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    提醒提前天数
                  </label>
                  <select
                    name="reminder_days"
                    className="form-select text-base"
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
                
                <div className="flex items-center pt-8">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="active"
                      className="form-checkbox h-5 w-5"
                      checked={formData.active}
                      onChange={handleChange}
                    />
                    <span className="ml-3 text-base text-gray-700 dark:text-gray-300">活跃订阅</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-10 pt-6 border-t border-gray-200 dark:border-dark-600">
            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                type="button"
                className="btn-outline px-8 py-3"
                onClick={() => navigate('/subscriptions')}
                disabled={loading}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn-primary px-8 py-3"
                disabled={loading}
              >
                {loading ? '保存中...' : '保存订阅'}
              </button>
            </div>
          </div>
        </form>
      </div>
      
      {loading && <Loader fullScreen />}
    </div>
  );
};

export default AddSubscription;
