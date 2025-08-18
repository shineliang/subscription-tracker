import React, { useState, useEffect } from 'react';
import { budgetAPI } from '../services/api';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const BudgetAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [visible, setVisible] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    fetchAlerts();
    // 只在组件首次加载时检查一次
    // checkAndCreateAlerts(); // 暂时禁用自动创建，避免重复
    
    // 定期获取警告（每30秒），但不创建新的
    const interval = setInterval(() => {
      fetchAlerts();
    }, 30 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await budgetAPI.getUnreadAlerts();
      // 确保没有重复的alerts（基于id去重）
      const uniqueAlerts = response.data ? 
        Array.from(new Map(response.data.map(alert => [alert.id, alert])).values()) : 
        [];
      setAlerts(uniqueAlerts);
    } catch (error) {
      console.error('获取预算警告失败:', error);
      // 如果获取失败，清空警告避免显示过时数据
      setAlerts([]);
    }
  };

  const checkAndCreateAlerts = async () => {
    if (isChecking) return; // 防止重复调用
    
    setIsChecking(true);
    try {
      await budgetAPI.checkAlerts();
      await fetchAlerts();
    } catch (error) {
      console.error('检查预算警告失败:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDismiss = async (alertId) => {
    try {
      // 立即从UI中移除，提供更好的用户体验
      setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== alertId));
      
      // 然后调用API标记为已读
      await budgetAPI.markAlertsAsRead([alertId]);
    } catch (error) {
      console.error('标记警告为已读失败:', error);
      // 如果失败，重新获取警告列表
      fetchAlerts();
    }
  };

  const handleDismissAll = async () => {
    try {
      const alertIds = alerts.map(alert => alert.id);
      // 立即清空UI
      setAlerts([]);
      
      // 然后调用API
      if (alertIds.length > 0) {
        await budgetAPI.markAlertsAsRead(alertIds);
      }
    } catch (error) {
      console.error('标记所有警告为已读失败:', error);
      // 如果失败，重新获取
      fetchAlerts();
    }
  };

  if (!visible || !alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <AnimatePresence mode="popLayout">
        {alerts.map((alert, index) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ delay: index * 0.1 }}
            className={`mb-3 p-4 rounded-lg shadow-lg ${
              alert.alert_type === 'exceeded' 
                ? 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800' 
                : 'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800'
            }`}
          >
            <div className="flex items-start">
              <ExclamationTriangleIcon 
                className={`h-5 w-5 flex-shrink-0 ${
                  alert.alert_type === 'exceeded' 
                    ? 'text-red-400' 
                    : 'text-yellow-400'
                }`} 
              />
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-medium ${
                  alert.alert_type === 'exceeded' 
                    ? 'text-red-800 dark:text-red-200' 
                    : 'text-yellow-800 dark:text-yellow-200'
                }`}>
                  {alert.budget_name}
                </h3>
                <p className={`mt-1 text-sm ${
                  alert.alert_type === 'exceeded' 
                    ? 'text-red-700 dark:text-red-300' 
                    : 'text-yellow-700 dark:text-yellow-300'
                }`}>
                  {alert.message}
                </p>
                <div className="mt-3 flex space-x-2">
                  <Link
                    to="/budgets"
                    className={`text-sm font-medium ${
                      alert.alert_type === 'exceeded' 
                        ? 'text-red-600 hover:text-red-500 dark:text-red-400' 
                        : 'text-yellow-600 hover:text-yellow-500 dark:text-yellow-400'
                    }`}
                  >
                    查看预算
                  </Link>
                  <button
                    onClick={() => handleDismiss(alert.id)}
                    className={`text-sm font-medium ${
                      alert.alert_type === 'exceeded' 
                        ? 'text-red-600 hover:text-red-500 dark:text-red-400' 
                        : 'text-yellow-600 hover:text-yellow-500 dark:text-yellow-400'
                    }`}
                  >
                    忽略
                  </button>
                </div>
              </div>
              <button
                onClick={() => handleDismiss(alert.id)}
                className="ml-2 flex-shrink-0 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <XMarkIcon className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {alerts.length > 1 && (
        <div className="text-center mt-2">
          <button
            onClick={handleDismissAll}
            className="text-sm text-gray-600 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300"
          >
            忽略所有警告
          </button>
        </div>
      )}
    </div>
  );
};

export default BudgetAlerts;