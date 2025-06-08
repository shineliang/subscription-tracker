import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  BellIcon,
  TagIcon,
  BuildingOfficeIcon,
  ClockIcon,
  PlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { subscriptionAPI, historyAPI } from '../services/api';
import SubscriptionHistory from '../components/SubscriptionHistory';
import ConfirmDialog from '../components/ConfirmDialog';

const SubscriptionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: '',
    notes: ''
  });

  useEffect(() => {
    fetchSubscription();
  }, [id]);

  const fetchSubscription = async () => {
    try {
      const response = await subscriptionAPI.getById(id);
      setSubscription(response.data);
      setPaymentData(prev => ({
        ...prev,
        amount: response.data.amount
      }));
    } catch (error) {
      console.error('获取订阅详情失败:', error);
      toast.error('加载订阅详情失败');
      navigate('/subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await subscriptionAPI.delete(id);
      toast.success('订阅已删除');
      navigate('/subscriptions');
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
    }
  };

  const handleRenew = async () => {
    try {
      await subscriptionAPI.renew(id);
      toast.success('续费成功');
      fetchSubscription();
    } catch (error) {
      console.error('续费失败:', error);
      toast.error('续费失败');
    }
  };

  const handleRecordPayment = async () => {
    try {
      await historyAPI.payment.record({
        subscription_id: id,
        ...paymentData
      });
      toast.success('付款记录已添加');
      setShowPaymentDialog(false);
      setPaymentData({
        amount: subscription.amount,
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        payment_method: '',
        notes: ''
      });
      // 刷新历史记录
      window.location.reload();
    } catch (error) {
      console.error('记录付款失败:', error);
      toast.error('记录付款失败');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!subscription) {
    return null;
  }

  const isActive = subscription.active === 1;
  const daysUntilPayment = Math.ceil(
    (new Date(subscription.next_payment_date) - new Date()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/subscriptions"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
            {subscription.name}
          </h1>
          {!isActive && (
            <span className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full">
              已取消
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          <Link
            to={`/subscriptions/edit/${id}`}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center space-x-2"
          >
            <PencilIcon className="h-4 w-4" />
            <span>编辑</span>
          </Link>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
          >
            <TrashIcon className="h-4 w-4" />
            <span>删除</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-dark-900 dark:text-white">
              基本信息
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">提供商</p>
                <p className="font-medium flex items-center">
                  <BuildingOfficeIcon className="h-4 w-4 mr-2 text-gray-400" />
                  {subscription.provider || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">分类</p>
                <p className="font-medium flex items-center">
                  <TagIcon className="h-4 w-4 mr-2 text-gray-400" />
                  {subscription.category || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">开始日期</p>
                <p className="font-medium flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                  {format(new Date(subscription.start_date), 'yyyy年MM月dd日', { locale: zhCN })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">提醒设置</p>
                <p className="font-medium flex items-center">
                  <BellIcon className="h-4 w-4 mr-2 text-gray-400" />
                  提前 {subscription.reminder_days} 天提醒
                </p>
              </div>
            </div>
            {subscription.description && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-1">描述</p>
                <p className="text-gray-700 dark:text-gray-300">{subscription.description}</p>
              </div>
            )}
          </div>

          {/* History */}
          <SubscriptionHistory subscriptionId={id} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Info */}
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-dark-900 dark:text-white">
              付款信息
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">金额</p>
                <p className="text-2xl font-bold text-primary-600">
                  {subscription.currency} {subscription.amount}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">计费周期</p>
                <p className="font-medium">
                  {subscription.billing_cycle === 'monthly' && '每月'}
                  {subscription.billing_cycle === 'yearly' && '每年'}
                  {subscription.billing_cycle === 'quarterly' && '每季度'}
                  {subscription.billing_cycle === 'half_yearly' && '每半年'}
                  {subscription.billing_cycle === 'weekly' && '每周'}
                  {subscription.billing_cycle === 'daily' && '每天'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">下次付款日期</p>
                <p className="font-medium">
                  {format(new Date(subscription.next_payment_date), 'yyyy年MM月dd日', { locale: zhCN })}
                </p>
                {isActive && (
                  <p className={`text-sm mt-1 ${
                    daysUntilPayment <= 7 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {daysUntilPayment > 0 
                      ? `还有 ${daysUntilPayment} 天到期`
                      : daysUntilPayment === 0
                      ? '今天到期'
                      : `已过期 ${Math.abs(daysUntilPayment)} 天`
                    }
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-2">
              <button
                onClick={handleRenew}
                disabled={!isActive}
                className={`w-full py-2 px-4 rounded-lg flex items-center justify-center space-x-2 ${
                  isActive
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <ArrowPathIcon className="h-5 w-5" />
                <span>续费一个周期</span>
              </button>
              <button
                onClick={() => setShowPaymentDialog(true)}
                className="w-full py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center space-x-2"
              >
                <PlusIcon className="h-5 w-5" />
                <span>记录付款</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-dark-900 dark:text-white">
              统计信息
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">创建时间</span>
                <span className="font-medium">
                  {format(new Date(subscription.created_at), 'yyyy-MM-dd', { locale: zhCN })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">最后更新</span>
                <span className="font-medium">
                  {format(new Date(subscription.updated_at), 'yyyy-MM-dd', { locale: zhCN })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="删除订阅"
        message={`确定要删除"${subscription.name}"吗？此操作不可恢复。`}
        confirmText="删除"
        type="danger"
      />

      {/* Payment Dialog */}
      {showPaymentDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-30" onClick={() => setShowPaymentDialog(false)}></div>
            <div className="relative bg-white dark:bg-dark-800 rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">记录付款</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">金额</label>
                  <input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">付款日期</label>
                  <input
                    type="date"
                    value={paymentData.payment_date}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">支付方式</label>
                  <select
                    value={paymentData.payment_method}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">请选择</option>
                    <option value="支付宝">支付宝</option>
                    <option value="微信">微信</option>
                    <option value="信用卡">信用卡</option>
                    <option value="银行转账">银行转账</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">备注</label>
                  <textarea
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    rows="3"
                  />
                </div>
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => setShowPaymentDialog(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleRecordPayment}
                  className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionDetail;