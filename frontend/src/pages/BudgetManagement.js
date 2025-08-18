import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { budgetAPI } from '../services/api';
import { formatCurrency } from '../services/utils';
import { toast } from 'react-toastify';
import { PlusIcon, PencilIcon, TrashIcon, ChartBarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

const BudgetManagement = () => {
  const [budgets, setBudgets] = useState([]);
  const [budgetUsages, setBudgetUsages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'total',
    period: 'monthly',
    amount: '',
    currency: 'CNY',
    category: '',
    warning_threshold: 80
  });

  const categories = [
    '娱乐', '工作效率', '教育学习', '云服务', 
    '开发工具', '设计工具', '音乐', '视频', 
    '新闻资讯', '健康健身', '其他'
  ];

  useEffect(() => {
    fetchBudgets();
    fetchBudgetUsages();
  }, []);

  const fetchBudgets = async () => {
    try {
      const response = await budgetAPI.getAll();
      setBudgets(response.data);
    } catch (error) {
      console.error('获取预算失败:', error);
      toast.error('获取预算失败');
    }
  };

  const fetchBudgetUsages = async () => {
    try {
      const response = await budgetAPI.getAllUsage();
      setBudgetUsages(response.data);
    } catch (error) {
      console.error('获取预算使用情况失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (submitting) return; // 防止重复提交
    
    setSubmitting(true);
    try {
      if (editingBudget) {
        await budgetAPI.update(editingBudget.id, formData);
        toast.success('预算更新成功');
      } else {
        await budgetAPI.create(formData);
        toast.success('预算创建成功');
      }
      
      setShowAddModal(false);
      setEditingBudget(null);
      resetForm();
      await fetchBudgets();
      await fetchBudgetUsages();
    } catch (error) {
      console.error('保存预算失败:', error);
      toast.error(error.response?.data?.error || '保存预算失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setFormData({
      name: budget.name,
      type: budget.type,
      period: budget.period,
      amount: budget.amount,
      currency: budget.currency,
      category: budget.category || '',
      warning_threshold: budget.warning_threshold
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这个预算吗？')) {
      setDeleting(id);
      try {
        await budgetAPI.delete(id);
        toast.success('预算删除成功');
        await fetchBudgets();
        await fetchBudgetUsages();
      } catch (error) {
        console.error('删除预算失败:', error);
        toast.error(error.response?.data?.error || '删除预算失败');
      } finally {
        setDeleting(null);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'total',
      period: 'monthly',
      amount: '',
      currency: 'CNY',
      category: '',
      warning_threshold: 80
    });
  };

  const getUsageForBudget = (budgetId) => {
    return budgetUsages.find(usage => usage.budget_id === budgetId);
  };

  const getProgressBarColor = (percentage) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    if (percentage >= 60) return 'bg-blue-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">预算管理</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">设置和管理您的订阅预算，控制支出</p>
        </div>
        <button
          onClick={() => {
            setEditingBudget(null);
            resetForm();
            setShowAddModal(true);
          }}
          className="btn btn-primary flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          创建预算
        </button>
      </div>

      {/* 预算列表 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {budgets.map((budget) => {
          const usage = getUsageForBudget(budget.id);
          const percentage = usage?.usage_percentage || 0;
          const isWarning = usage?.warning_triggered;
          const isExceeded = usage?.exceeded;
          
          return (
            <motion.div
              key={budget.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {budget.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {budget.type === 'total' ? '总预算' : `${budget.category}预算`} · 
                      {budget.period === 'monthly' ? '月度' : '年度'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(budget)}
                      className="p-1 text-gray-500 hover:text-primary-500"
                      disabled={deleting === budget.id}
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="p-1 text-gray-500 hover:text-red-500 disabled:opacity-50"
                      disabled={deleting === budget.id}
                    >
                      {deleting === budget.id ? (
                        <div className="h-5 w-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <TrashIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">已使用</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(usage?.spent_amount || 0, budget.currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">预算总额</p>
                      <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                        {formatCurrency(budget.amount, budget.currency)}
                      </p>
                    </div>
                  </div>

                  {/* 进度条 */}
                  <div className="relative">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(percentage, 100)}%` }}
                        transition={{ duration: 0.5 }}
                        className={`h-full ${getProgressBarColor(percentage)}`}
                      />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {percentage.toFixed(1)}% 已使用
                    </p>
                  </div>
                </div>

                {/* 状态标签 */}
                {isExceeded && (
                  <div className="flex items-center text-red-600 dark:text-red-400 text-sm">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    预算已超支 {formatCurrency(Math.abs(usage.remaining_amount), budget.currency)}
                  </div>
                )}
                {isWarning && !isExceeded && (
                  <div className="flex items-center text-yellow-600 dark:text-yellow-400 text-sm">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    接近预算上限（{budget.warning_threshold}%警戒线）
                  </div>
                )}
                {!isWarning && !isExceeded && (
                  <div className="text-green-600 dark:text-green-400 text-sm">
                    剩余 {formatCurrency(usage?.remaining_amount || budget.amount, budget.currency)}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {budgets.length === 0 && (
        <div className="text-center py-12">
          <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            还没有设置预算
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            创建预算来控制您的订阅支出
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            创建第一个预算
          </button>
        </div>
      )}

      {/* 添加/编辑预算模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-dark-800 rounded-lg max-w-md w-full p-6"
          >
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
              {editingBudget ? '编辑预算' : '创建预算'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    预算名称
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    required
                    placeholder="例如：每月订阅预算"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      预算类型
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="input"
                      disabled={editingBudget}
                    >
                      <option value="total">总预算</option>
                      <option value="category">分类预算</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      预算周期
                    </label>
                    <select
                      value={formData.period}
                      onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                      className="input"
                      disabled={editingBudget}
                    >
                      <option value="monthly">月度</option>
                      <option value="yearly">年度</option>
                    </select>
                  </div>
                </div>

                {formData.type === 'category' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      类别
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="input"
                      required
                      disabled={editingBudget}
                    >
                      <option value="">选择类别</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      预算金额
                    </label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="input"
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      货币
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="input"
                    >
                      <option value="CNY">CNY ¥</option>
                      <option value="USD">USD $</option>
                      <option value="EUR">EUR €</option>
                      <option value="GBP">GBP £</option>
                      <option value="JPY">JPY ¥</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    预警阈值 ({formData.warning_threshold}%)
                  </label>
                  <input
                    type="range"
                    value={formData.warning_threshold}
                    onChange={(e) => setFormData({ ...formData, warning_threshold: parseInt(e.target.value) })}
                    className="w-full"
                    min="50"
                    max="95"
                    step="5"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    当使用率达到 {formData.warning_threshold}% 时发出警告
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingBudget(null);
                    resetForm();
                  }}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      处理中...
                    </span>
                  ) : (
                    editingBudget ? '更新' : '创建'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BudgetManagement;