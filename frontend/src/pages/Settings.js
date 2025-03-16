import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
  BellIcon,
  EnvelopeIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import Loader from '../components/Loader';
import { notificationAPI } from '../services/api';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    email: '',
    notify_days_before: 7,
    email_notifications: false,
    browser_notifications: true
  });
  
  // 获取设置
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await notificationAPI.getSettings();
        
        setSettings({
          ...response.data,
          email_notifications: Boolean(response.data.email_notifications),
          browser_notifications: Boolean(response.data.browser_notifications)
        });
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('获取设置失败，使用默认设置');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // 如果启用了邮件通知但没有邮箱，显示错误
      if (settings.email_notifications && !settings.email) {
        toast.warning('请输入邮箱地址以启用邮件通知');
        return;
      }
      
      // 更新设置
      await notificationAPI.updateSettings({
        ...settings,
        notify_days_before: parseInt(settings.notify_days_before),
        email_notifications: settings.email_notifications ? 1 : 0,
        browser_notifications: settings.browser_notifications ? 1 : 0,
      });
      
      toast.success('设置已保存');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('保存设置失败，请稍后再试');
    } finally {
      setSaving(false);
    }
  };
  
  const handleReset = () => {
    setSettings({
      email: '',
      notify_days_before: 7,
      email_notifications: false,
      browser_notifications: true
    });
    
    toast.info('设置已重置');
  };
  
  if (loading) {
    return <Loader />;
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-dark-600 dark:text-white mb-6">设置</h1>
      
      <motion.div 
        className="bg-white dark:bg-dark-700 rounded-lg shadow-md divide-y divide-gray-200 dark:divide-dark-600"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* 通知设置 */}
        <div className="p-6">
          <div className="flex items-center mb-4">
            <BellIcon className="h-6 w-6 text-primary-500 mr-2" />
            <h2 className="text-lg font-semibold text-dark-600 dark:text-white">通知设置</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="browser_notifications"
                  className="form-checkbox"
                  checked={settings.browser_notifications}
                  onChange={handleChange}
                />
                <span className="ml-2 text-gray-700 dark:text-gray-300">启用浏览器通知</span>
              </label>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 ml-6">
                当有订阅即将到期时，在网站上显示通知
              </p>
            </div>
            
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="email_notifications"
                  className="form-checkbox"
                  checked={settings.email_notifications}
                  onChange={handleChange}
                />
                <span className="ml-2 text-gray-700 dark:text-gray-300">启用邮件通知</span>
              </label>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 ml-6">
                当有订阅即将到期时，发送提醒邮件
              </p>
            </div>
            
            {settings.email_notifications && (
              <div className="ml-6 mt-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  邮箱地址
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    className="form-input pl-10"
                    placeholder="your@email.com"
                    value={settings.email}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                提前提醒天数
              </label>
              <div className="mt-1 relative rounded-md shadow-sm max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ClockIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <select
                  name="notify_days_before"
                  className="form-select pl-10"
                  value={settings.notify_days_before}
                  onChange={handleChange}
                >
                  <option value="1">1天前</option>
                  <option value="3">3天前</option>
                  <option value="5">5天前</option>
                  <option value="7">7天前</option>
                  <option value="14">14天前</option>
                  <option value="30">30天前</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        {/* 默认货币设置（模拟功能） */}
        <div className="p-6">
          <div className="flex items-center mb-4">
            <CurrencyDollarIcon className="h-6 w-6 text-primary-500 mr-2" />
            <h2 className="text-lg font-semibold text-dark-600 dark:text-white">默认货币设置</h2>
          </div>
          
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              默认货币
            </label>
            <select
              className="form-select"
              defaultValue="CNY"
            >
              <option value="CNY">人民币 (¥)</option>
              <option value="USD">美元 ($)</option>
              <option value="EUR">欧元 (€)</option>
              <option value="GBP">英镑 (£)</option>
              <option value="JPY">日元 (¥)</option>
            </select>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              添加新订阅时的默认货币
            </p>
          </div>
        </div>
        
        {/* 数据管理（模拟功能） */}
        <div className="p-6">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-2" />
            <h2 className="text-lg font-semibold text-dark-600 dark:text-white">数据管理</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-gray-700 dark:text-gray-300">
                导出所有订阅数据或从备份文件导入
              </p>
              <div className="mt-3 flex space-x-3">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => toast.info('功能开发中...')}
                >
                  导出数据
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => toast.info('功能开发中...')}
                >
                  导入数据
                </button>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-dark-600">
              <p className="text-gray-700 dark:text-gray-300">
                危险操作区域
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                以下操作无法撤销，请谨慎操作
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => toast.warning('此功能已禁用，请联系管理员')}
                >
                  清除所有数据
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* 操作按钮 */}
      <div className="mt-8 flex justify-end space-x-3">
        <button
          type="button"
          className="btn-outline flex items-center"
          onClick={handleReset}
          disabled={saving}
        >
          <ArrowPathIcon className="mr-1.5 h-5 w-5" />
          重置设置
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
      
      {saving && <Loader fullScreen />}
    </div>
  );
};

export default Settings;
