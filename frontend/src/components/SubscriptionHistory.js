import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  ClockIcon, 
  CurrencyDollarIcon, 
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon 
} from '@heroicons/react/24/outline';
import { historyAPI } from '../services/api';
import { toast } from 'react-toastify';

const SubscriptionHistory = ({ subscriptionId }) => {
  const [activeTab, setActiveTab] = useState('changes'); // 'changes' or 'payments'
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (subscriptionId) {
      fetchHistory();
    }
  }, [subscriptionId, activeTab]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      if (activeTab === 'changes') {
        const response = await historyAPI.subscription.getBySubscriptionId(subscriptionId);
        setSubscriptionHistory(response.data);
      } else {
        const response = await historyAPI.payment.getBySubscriptionId(subscriptionId);
        setPaymentHistory(response.data);
      }
    } catch (error) {
      console.error('获取历史记录失败:', error);
      toast.error('加载历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  const formatChangeType = (type) => {
    const types = {
      'created': { label: '创建', color: 'text-green-600' },
      'updated': { label: '更新', color: 'text-blue-600' },
      'cancelled': { label: '取消', color: 'text-red-600' },
      'reactivated': { label: '重新激活', color: 'text-green-600' }
    };
    return types[type] || { label: type, color: 'text-gray-600' };
  };

  const formatFieldName = (field) => {
    const fields = {
      'name': '名称',
      'amount': '金额',
      'currency': '货币',
      'billing_cycle': '计费周期',
      'provider': '提供商',
      'category': '分类',
      'active': '状态'
    };
    return fields[field] || field;
  };

  const formatValue = (field, value) => {
    if (field === 'active') {
      return value === '1' || value === 1 ? '激活' : '未激活';
    }
    if (field === 'amount') {
      return `¥${value}`;
    }
    return value || '-';
  };

  const renderChangeHistory = () => {
    const displayHistory = showAll ? subscriptionHistory : subscriptionHistory.slice(0, 5);
    
    return (
      <div className="space-y-3">
        {displayHistory.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无变更记录</p>
        ) : (
          displayHistory.map((item) => {
            const changeType = formatChangeType(item.change_type);
            return (
              <div key={item.id} className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`font-semibold ${changeType.color}`}>
                        {changeType.label}
                      </span>
                      {item.field_name && (
                        <span className="text-sm text-gray-500">
                          - {formatFieldName(item.field_name)}
                        </span>
                      )}
                    </div>
                    {item.field_name && (
                      <div className="mt-1 text-sm">
                        <span className="text-gray-500">从 </span>
                        <span className="font-medium">{formatValue(item.field_name, item.old_value)}</span>
                        <span className="text-gray-500"> 变更为 </span>
                        <span className="font-medium">{formatValue(item.field_name, item.new_value)}</span>
                      </div>
                    )}
                    {item.notes && (
                      <p className="mt-1 text-sm text-gray-600">{item.notes}</p>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(item.change_date), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {subscriptionHistory.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2 text-sm text-primary-600 hover:text-primary-700 flex items-center justify-center space-x-1"
          >
            <span>{showAll ? '收起' : `查看全部 ${subscriptionHistory.length} 条记录`}</span>
            {showAll ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
          </button>
        )}
      </div>
    );
  };

  const renderPaymentHistory = () => {
    const displayHistory = showAll ? paymentHistory : paymentHistory.slice(0, 5);
    
    return (
      <div className="space-y-3">
        {displayHistory.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无付款记录</p>
        ) : (
          displayHistory.map((payment) => (
            <div key={payment.id} className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <CurrencyDollarIcon className="h-5 w-5 text-green-500" />
                    <span className="font-semibold">
                      {payment.currency} {payment.amount}
                    </span>
                    {payment.status !== 'completed' && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {payment.status === 'pending' ? '待付款' : '失败'}
                      </span>
                    )}
                  </div>
                  {payment.payment_method && (
                    <p className="mt-1 text-sm text-gray-600">
                      支付方式: {payment.payment_method}
                    </p>
                  )}
                  {payment.notes && (
                    <p className="mt-1 text-sm text-gray-500">{payment.notes}</p>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {format(new Date(payment.payment_date), 'yyyy-MM-dd', { locale: zhCN })}
                </div>
              </div>
            </div>
          ))
        )}
        
        {paymentHistory.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2 text-sm text-primary-600 hover:text-primary-700 flex items-center justify-center space-x-1"
          >
            <span>{showAll ? '收起' : `查看全部 ${paymentHistory.length} 条记录`}</span>
            {showAll ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark-900 dark:text-white flex items-center">
          <ClockIcon className="h-5 w-5 mr-2" />
          历史记录
        </h3>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-dark-600 mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('changes');
              setShowAll(false);
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'changes'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            变更历史
          </button>
          <button
            onClick={() => {
              setActiveTab('payments');
              setShowAll(false);
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'payments'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            付款记录
          </button>
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div>
          {activeTab === 'changes' ? renderChangeHistory() : renderPaymentHistory()}
        </div>
      )}
    </div>
  );
};

export default SubscriptionHistory;