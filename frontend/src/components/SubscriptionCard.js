import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate, formatBillingCycle, daysUntil, getReminderStatus, getReminderStatusClass, getReminderStatusText } from '../services/utils';
import { motion } from 'framer-motion';
import { PencilIcon, TrashIcon, ClockIcon, ArrowPathIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { subscriptionAPI } from '../services/api';
import { toast } from 'react-toastify';

const SubscriptionCard = ({ subscription, onDelete, onUpdate }) => {
  const [isRenewing, setIsRenewing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const {
    id,
    name,
    description,
    provider,
    amount,
    currency,
    billing_cycle,
    cycle_count,
    next_payment_date,
    category,
    cancelled_at
  } = subscription;
  
  const days = daysUntil(next_payment_date);
  const status = getReminderStatus(days);
  const statusClass = getReminderStatusClass(status);
  const statusText = getReminderStatusText(status);
  
  return (
    <motion.div 
      className="card card-hover overflow-hidden"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <div className="flex flex-col h-full">
        <div className="p-5 flex-1">
          <div className="flex items-center justify-between">
            <Link 
              to={`/subscriptions/${id}`} 
              className="flex-1 min-w-0 mr-2 group"
            >
              <h3 className="text-lg font-semibold text-dark-600 dark:text-white truncate group-hover:text-primary-600 transition-colors">
                {name}
              </h3>
            </Link>
            <div className={`px-2 py-1 text-xs font-medium rounded ${statusClass}`}>
              {statusText}
            </div>
          </div>
          
          {provider && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{provider}</p>
          )}
          
          {description && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-3">{description}</p>
          )}
          
          <div className="mt-4">
            <div className="text-2xl font-bold text-dark-600 dark:text-white">
              {formatCurrency(amount, currency)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {formatBillingCycle(billing_cycle, cycle_count)}
            </div>
          </div>
          
          {category && (
            <div className="mt-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                {category}
              </span>
            </div>
          )}
          
          {cancelled_at && (
            <div className="mt-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                订阅周期结束后取消
              </span>
            </div>
          )}
        </div>
        
        <div className="border-t border-gray-200 dark:border-dark-600 p-4 bg-gray-50 dark:bg-dark-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <ClockIcon className="h-4 w-4 mr-1" />
              <span>
                {days === 0
                  ? '今天到期'
                  : days < 0
                  ? `已过期${Math.abs(days)}天`
                  : `${days}天后到期`}
              </span>
              <span className="mx-1">•</span>
              <span>{formatDate(next_payment_date)}</span>
            </div>
            
            <div className="flex space-x-2">
              {/* 续费按钮 */}
              {!cancelled_at && (
                <button
                  onClick={async () => {
                    if (isRenewing) return; // 防止重复点击
                    
                    try {
                      setIsRenewing(true);
                      const response = await subscriptionAPI.renew(id);
                      toast.success(response.data.message || '订阅已成功续费一个周期');
                      if (onUpdate) onUpdate(response.data);
                    } catch (error) {
                      console.error('续费失败:', error);
                      toast.error('续费失败，请稍后再试');
                    } finally {
                      setIsRenewing(false);
                    }
                  }}
                  disabled={isRenewing}
                  className={`p-1 text-gray-500 hover:text-green-500 dark:text-gray-400 dark:hover:text-green-400 ${isRenewing ? 'cursor-not-allowed opacity-50' : ''}`}
                  title="续费一个周期（保持日期连续）"
                >
                  <ArrowPathIcon className={`h-5 w-5 ${isRenewing ? 'animate-spin' : ''}`} />
                </button>
              )}
              <Link 
                to={`/subscriptions/edit/${id}`}
                className="p-1 text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400"
              >
                <PencilIcon className="h-5 w-5" />
              </Link>
              {/* 取消订阅按钮 */}
              {!cancelled_at && (
                <button
                  onClick={async () => {
                    if (isCancelling) return; // 防止重复点击
                    
                    if (window.confirm('确定要取消此订阅吗？当前订阅周期结束后将不再续费。')) {
                      try {
                        setIsCancelling(true);
                        const response = await subscriptionAPI.cancel(id);
                        toast.success('订阅已设置为周期结束后取消');
                        if (onUpdate) onUpdate(response.data);
                      } catch (error) {
                        console.error('取消订阅失败:', error);
                        toast.error('取消订阅失败，请稍后再试');
                      } finally {
                        setIsCancelling(false);
                      }
                    }
                  }}
                  disabled={isCancelling}
                  className={`p-1 text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-400 ${isCancelling ? 'cursor-not-allowed opacity-50' : ''}`}
                  title="取消订阅"
                >
                  <XCircleIcon className={`h-5 w-5 ${isCancelling ? 'animate-pulse' : ''}`} />
                </button>
              )}
              <button 
                onClick={() => onDelete(id)}
                className="p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SubscriptionCard;
