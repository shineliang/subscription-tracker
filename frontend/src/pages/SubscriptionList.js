import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { 
  PlusIcon, 
  FunnelIcon, 
  MagnifyingGlassIcon,
  ListBulletIcon,
  Squares2X2Icon,
  ArrowsUpDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import SubscriptionCard from '../components/SubscriptionCard';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { subscriptionAPI } from '../services/api';
import { formatCurrency, formatDate, formatBillingCycle, daysUntil, getReminderStatusClass, getReminderStatusText } from '../services/utils';

const SubscriptionList = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // grid或list
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('next_payment_date'); // name, amount, next_payment_date
  const [sortOrder, setSortOrder] = useState('asc'); // asc或desc
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, cancelled
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });
  
  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await subscriptionAPI.getAll();
      setSubscriptions(response.data);
      setFilteredSubscriptions(response.data);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('获取订阅列表失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchSubscriptions();
  }, []);
  
  useEffect(() => {
    // 应用搜索、排序和过滤
    let result = [...subscriptions];
    
    // 搜索
    if (searchTerm) {
      result = result.filter(
        sub => 
          sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (sub.provider && sub.provider.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (sub.description && sub.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // 类别过滤
    if (filterCategory) {
      result = result.filter(sub => sub.category === filterCategory);
    }
    
    // 状态过滤
    if (filterStatus !== 'all') {
      if (filterStatus === 'active') {
        result = result.filter(sub => !sub.cancelled_at);
      } else if (filterStatus === 'cancelled') {
        result = result.filter(sub => sub.cancelled_at);
      }
    }
    
    // 排序
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'next_payment_date':
          comparison = new Date(a.next_payment_date) - new Date(b.next_payment_date);
          break;
        default:
          comparison = new Date(a.next_payment_date) - new Date(b.next_payment_date);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    setFilteredSubscriptions(result);
  }, [subscriptions, searchTerm, sortBy, sortOrder, filterCategory, filterStatus]);
  
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  const handleSortChange = (field) => {
    if (sortBy === field) {
      // 如果已经按照这个字段排序，则切换排序顺序
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 否则按照新字段排序，默认升序
      setSortBy(field);
      setSortOrder('asc');
    }
  };
  
  const handleFilterChange = (e) => {
    setFilterCategory(e.target.value);
  };
  
  const handleStatusFilterChange = (e) => {
    setFilterStatus(e.target.value);
  };
  
  // 计算状态统计
  const getStatusCounts = () => {
    const total = subscriptions.length;
    const active = subscriptions.filter(sub => !sub.cancelled_at).length;
    const cancelled = subscriptions.filter(sub => sub.cancelled_at).length;
    return { total, active, cancelled };
  };
  
  const handleDelete = async (id) => {
    setConfirmDialog({ isOpen: true, id });
  };
  
  const confirmDelete = async () => {
    try {
      await subscriptionAPI.delete(confirmDialog.id);
      setSubscriptions(subscriptions.filter(sub => sub.id !== confirmDialog.id));
      toast.success('订阅已删除');
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast.error('删除失败，请稍后再试');
    } finally {
      setConfirmDialog({ isOpen: false, id: null });
    }
  };
  
  // 处理订阅续费后的更新
  const handleSubscriptionRenew = (updatedSubscription) => {
    // 更新订阅列表中的订阅数据
    const updatedSubscriptions = subscriptions.map(sub => 
      sub.id === updatedSubscription.id ? updatedSubscription : sub
    );
    setSubscriptions(updatedSubscriptions);
  };
  
  const getUniqueCategories = () => {
    const categories = subscriptions
      .map(sub => sub.category)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);
    
    return categories;
  };
  
  // 渲染表格内容的辅助函数
  const renderTableContent = (subscriptionList) => (
    <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
      <thead className="bg-gray-50 dark:bg-dark-800">
        <tr>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            名称
          </th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            金额
          </th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            周期
          </th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            到期日期
          </th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            状态
          </th>
          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            操作
          </th>
        </tr>
      </thead>
      <tbody className="bg-white dark:bg-dark-700 divide-y divide-gray-200 dark:divide-dark-600">
        {subscriptionList.map((subscription) => {
          const days = daysUntil(subscription.next_payment_date);
          const status = days < 0 ? 'expired' : days === 0 ? 'today' : days <= 3 ? 'soon' : days <= 7 ? 'upcoming' : 'safe';
          const statusClass = getReminderStatusClass(status);
          const statusText = getReminderStatusText(status);
          
          return (
            <tr key={subscription.id} className="hover:bg-gray-50 dark:hover:bg-dark-600">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {subscription.name}
                    </div>
                    {subscription.provider && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {subscription.provider}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-white">
                  {formatCurrency(subscription.amount, subscription.currency)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-white">
                  {formatBillingCycle(subscription.billing_cycle, subscription.cycle_count)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-white">
                  {formatDate(subscription.next_payment_date)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {subscription.cancelled_at
                    ? '已取消'
                    : days < 0 
                    ? `已过期${Math.abs(days)}天` 
                    : days === 0 
                    ? '今天到期' 
                    : `${days}天后到期`}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {subscription.cancelled_at ? (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    已取消
                  </span>
                ) : (
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`}>
                    {statusText}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-3">
                  {!subscription.cancelled_at && (
                    <button
                      onClick={async () => {
                        try {
                          const response = await subscriptionAPI.renew(subscription.id);
                          toast.success('订阅已成功续费一个周期');
                          handleSubscriptionRenew(response.data);
                        } catch (error) {
                          console.error('续费失败:', error);
                          toast.error('续费失败，请稍后再试');
                        }
                      }}
                      className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                      title="续费一个周期"
                    >
                      续费
                    </button>
                  )}
                  <Link 
                    to={`/subscriptions/edit/${subscription.id}`}
                    className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    编辑
                  </Link>
                  <button
                    onClick={() => handleDelete(subscription.id)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
  
  if (loading) {
    return <Loader />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-600 dark:text-white">所有订阅</h1>
          {/* 状态统计 */}
          <div className="flex space-x-4 mt-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              总计: <span className="font-semibold">{getStatusCounts().total}</span>
            </span>
            <span className="text-green-600 dark:text-green-400">
              活跃: <span className="font-semibold">{getStatusCounts().active}</span>
            </span>
            <span className="text-red-600 dark:text-red-400">
              已取消: <span className="font-semibold">{getStatusCounts().cancelled}</span>
            </span>
          </div>
        </div>
        <Link
          to="/subscriptions/add"
          className="btn-primary"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          添加新订阅
        </Link>
      </div>
      
      {/* 搜索和过滤工具栏 */}
      <div className="bg-white dark:bg-dark-700 rounded-lg shadow p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="form-input pl-10"
              placeholder="搜索订阅..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          
          {/* 状态过滤 */}
          <div className="w-full md:w-40">
            <select
              className="form-select"
              value={filterStatus}
              onChange={handleStatusFilterChange}
            >
              <option value="all">全部</option>
              <option value="active">活跃</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>
          
          {/* 类别过滤 */}
          <div className="w-full md:w-48">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
              </div>
              <select
                className="form-select pl-10"
                value={filterCategory}
                onChange={handleFilterChange}
              >
                <option value="">所有类别</option>
                {getUniqueCategories().map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* 视图切换 */}
          <div className="flex space-x-2">
            <button
              className={`p-2 rounded-md ${
                viewMode === 'grid' 
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' 
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-600'
              }`}
              onClick={() => setViewMode('grid')}
            >
              <Squares2X2Icon className="h-5 w-5" />
            </button>
            <button
              className={`p-2 rounded-md ${
                viewMode === 'list' 
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' 
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-600'
              }`}
              onClick={() => setViewMode('list')}
            >
              <ListBulletIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* 排序工具栏 */}
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <span>排序: </span>
          <button
            className={`ml-2 px-3 py-1 rounded-md ${
              sortBy === 'name' ? 'bg-gray-100 dark:bg-dark-600' : ''
            }`}
            onClick={() => handleSortChange('name')}
          >
            名称
            {sortBy === 'name' && (
              <ArrowsUpDownIcon className="inline-block ml-1 h-4 w-4" />
            )}
          </button>
          <button
            className={`ml-2 px-3 py-1 rounded-md ${
              sortBy === 'amount' ? 'bg-gray-100 dark:bg-dark-600' : ''
            }`}
            onClick={() => handleSortChange('amount')}
          >
            金额
            {sortBy === 'amount' && (
              <ArrowsUpDownIcon className="inline-block ml-1 h-4 w-4" />
            )}
          </button>
          <button
            className={`ml-2 px-3 py-1 rounded-md ${
              sortBy === 'next_payment_date' ? 'bg-gray-100 dark:bg-dark-600' : ''
            }`}
            onClick={() => handleSortChange('next_payment_date')}
          >
            到期日期
            {sortBy === 'next_payment_date' && (
              <ArrowsUpDownIcon className="inline-block ml-1 h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      
      {/* 订阅列表 */}
      {filteredSubscriptions.length > 0 ? (
        filterStatus === 'all' && subscriptions.some(sub => sub.cancelled_at) ? (
          // 分组显示：活跃订阅和已取消订阅
          <div className="space-y-8">
            {/* 活跃订阅 */}
            {filteredSubscriptions.filter(sub => !sub.cancelled_at).length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">活跃订阅</h2>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSubscriptions.filter(sub => !sub.cancelled_at).map((subscription) => (
                      <SubscriptionCard 
                        key={subscription.id}
                        subscription={subscription}
                        onDelete={handleDelete}
                        onUpdate={handleSubscriptionRenew}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-dark-700 rounded-lg shadow overflow-hidden mb-6">
                    {renderTableContent(filteredSubscriptions.filter(sub => !sub.cancelled_at))}
                  </div>
                )}
              </div>
            )}
            
            {/* 已取消订阅 */}
            {filteredSubscriptions.filter(sub => sub.cancelled_at).length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">已取消订阅</h2>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSubscriptions.filter(sub => sub.cancelled_at).map((subscription) => (
                      <SubscriptionCard 
                        key={subscription.id}
                        subscription={subscription}
                        onDelete={handleDelete}
                        onUpdate={handleSubscriptionRenew}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-dark-700 rounded-lg shadow overflow-hidden">
                    {renderTableContent(filteredSubscriptions.filter(sub => sub.cancelled_at))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSubscriptions.map((subscription) => (
                <SubscriptionCard 
                  key={subscription.id}
                  subscription={subscription}
                  onDelete={handleDelete}
                  onUpdate={handleSubscriptionRenew}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-dark-700 rounded-lg shadow overflow-hidden">
              {renderTableContent(filteredSubscriptions)}
            </div>
          )
        )
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <EmptyState 
            title="没有找到订阅"
            description={searchTerm || filterCategory ? "请尝试其他搜索条件" : "添加新的订阅以开始追踪您的支出"}
            icon={<ListBulletIcon className="h-12 w-12 text-primary-500" />}
            actionLink="/subscriptions/add"
            actionText="添加订阅"
          />
        </motion.div>
      )}
      
      {/* 确认对话框 */}
      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        title="确认删除"
        message="您确定要删除这个订阅吗？此操作无法撤销。"
        confirmText="删除"
        cancelText="取消"
        type="danger"
      />
    </div>
  );
};

export default SubscriptionList;
