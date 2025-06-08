import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  LightBulbIcon, 
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import axios from 'axios';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';

const API_URL = process.env.REACT_APP_API_URL || '';

// Create axios instance for analysis API
const analysisAPI = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
analysisAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle authentication errors
analysisAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

function IntelligentAnalysis() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [analysisData, setAnalysisData] = useState({
    duplicates: null,
    usageFrequency: null,
    costBenefit: null,
    suggestions: null,
    trendReport: null,
    recommendations: null
  });

  useEffect(() => {
    loadAnalysisData();
  }, []);

  const loadAnalysisData = async () => {
    setLoading(true);
    try {
      const [duplicates, suggestions, trendReport, recommendations] = await Promise.all([
        analysisAPI.get('/analysis/duplicate-subscriptions'),
        analysisAPI.get('/analysis/optimization-suggestions'),
        analysisAPI.get('/analysis/trend-report?months=6'),
        analysisAPI.get('/analysis/recommendations')
      ]);

      setAnalysisData({
        duplicates: duplicates.data,
        suggestions: suggestions.data,
        trendReport: trendReport.data,
        recommendations: recommendations.data,
        usageFrequency: null,
        costBenefit: null
      });
    } catch (error) {
      toast.error('加载分析数据失败');
      console.error('Failed to load analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsageFrequency = async () => {
    try {
      const response = await analysisAPI.get('/analysis/usage-frequency');
      setAnalysisData(prev => ({ ...prev, usageFrequency: response.data }));
    } catch (error) {
      toast.error('加载使用频率分析失败');
    }
  };

  const loadCostBenefit = async () => {
    try {
      const response = await analysisAPI.get('/analysis/cost-benefit');
      setAnalysisData(prev => ({ ...prev, costBenefit: response.data }));
    } catch (error) {
      toast.error('加载成本效益分析失败');
    }
  };

  const formatCurrency = (amount) => {
    return `¥${amount.toFixed(2)}`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const renderOverview = () => {
    const { suggestions, trendReport, recommendations } = analysisData;
    
    if (!suggestions || !trendReport || !recommendations) return null;

    return (
      <div className="space-y-6">
        {/* 关键指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">潜在节省</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(suggestions.totalPotentialSavings || 0)}
                </p>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">重复订阅</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {suggestions.summary?.duplicates || 0}
                </p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">支出趋势</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {trendReport.statistics?.trend === 'increasing' ? '上升' : 
                   trendReport.statistics?.trend === 'decreasing' ? '下降' : '稳定'}
                </p>
              </div>
              <ArrowTrendingUpIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">优化建议</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {recommendations.recommendations?.length || 0}
                </p>
              </div>
              <LightBulbIcon className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* 洞察信息 */}
        {trendReport.insights && trendReport.insights.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-lg font-medium text-blue-900 dark:text-blue-200 mb-2">
              趋势洞察
            </h3>
            <ul className="space-y-1">
              {trendReport.insights.map((insight, index) => (
                <li key={index} className="flex items-start">
                  <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-blue-800 dark:text-blue-300">{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 优化建议列表 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            优化建议
          </h3>
          <div className="space-y-4">
            {suggestions.suggestions?.slice(0, 5).map((suggestion, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getPriorityColor(suggestion.priority)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {suggestion.title}
                    </h4>
                    {suggestion.subscription && (
                      <div className="bg-gray-100 dark:bg-gray-700 rounded p-2 mt-2 mb-2">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {suggestion.subscription.name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {suggestion.subscription.provider} • {formatCurrency(suggestion.subscription.amount)}/{
                            suggestion.subscription.billing_cycle === 'monthly' ? '月' :
                            suggestion.subscription.billing_cycle === 'yearly' ? '年' :
                            suggestion.subscription.billing_cycle === 'half_yearly' ? '半年' :
                            suggestion.subscription.billing_cycle === 'quarterly' ? '季度' :
                            suggestion.subscription.billing_cycle === 'weekly' ? '周' :
                            suggestion.subscription.billing_cycle === 'daily' ? '日' :
                            suggestion.subscription.billing_cycle
                          }
                        </p>
                      </div>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {suggestion.description}
                    </p>
                    <p className="text-sm font-medium mt-2">{suggestion.action}</p>
                    {suggestion.savings > 0 && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        可节省: {formatCurrency(suggestion.savings)}/月
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    suggestion.priority === 'high' ? 'bg-red-100 text-red-800' :
                    suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {suggestion.priority === 'high' ? '高' :
                     suggestion.priority === 'medium' ? '中' : '低'}优先级
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDuplicates = () => {
    const { duplicates } = analysisData;
    
    if (!duplicates) return null;

    if (duplicates.count === 0) {
      return (
        <EmptyState
          icon={CheckCircleIcon}
          title="没有发现重复订阅"
          description="您的订阅管理得很好，没有发现重复的服务"
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                发现 {duplicates.count} 组重复订阅
              </h3>
              <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                取消重复订阅可节省 {formatCurrency(duplicates.totalPotentialSavings)}/月
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {duplicates.duplicates.map((group, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                重复组 {index + 1}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[group.main, ...group.duplicates].map((sub, subIndex) => (
                  <div
                    key={sub.id}
                    className={`border rounded-lg p-4 ${
                      subIndex === 0 
                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
                        : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white">
                          {sub.name}
                        </h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {sub.provider}
                        </p>
                        <p className="text-sm font-medium mt-2">
                          {formatCurrency(sub.amount)}/{
                            sub.billing_cycle === 'monthly' ? '月' :
                            sub.billing_cycle === 'yearly' ? '年' : sub.billing_cycle
                          }
                        </p>
                      </div>
                      {subIndex === 0 ? (
                        <span className="text-xs font-medium text-green-800 bg-green-100 px-2 py-1 rounded">
                          建议保留
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-red-800 bg-red-100 px-2 py-1 rounded">
                          建议取消
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                重复原因: {
                  group.reason === 'same_name' ? '相同名称' :
                  group.reason === 'same_provider' ? '相同提供商' : '相似服务'
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderUsageFrequency = () => {
    const { usageFrequency } = analysisData;
    
    if (!usageFrequency) {
      loadUsageFrequency();
      return <Loader />;
    }

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            使用频率分析
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">低使用率订阅</p>
              <p className="text-2xl font-bold text-red-600">{usageFrequency.lowUsageCount}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">潜在节省</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(usageFrequency.potentialSavings)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">分析订阅数</p>
              <p className="text-2xl font-bold text-blue-600">{usageFrequency.results?.length || 0}</p>
            </div>
          </div>

          <div className="space-y-4">
            {usageFrequency.results?.map((result) => (
              <div
                key={result.subscription.id}
                className={`border rounded-lg p-4 ${
                  result.analysis.status === 'low' 
                    ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                    : result.analysis.status === 'medium'
                    ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
                    : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {result.subscription.name}
                    </h4>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">实际付款:</span>
                        <span className="ml-2 font-medium">{result.analysis.actualPayments}次</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">预期付款:</span>
                        <span className="ml-2 font-medium">{result.analysis.expectedPayments}次</span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {result.analysis.recommendation}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {result.analysis.usageRate.toFixed(0)}%
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">使用率</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCostBenefit = () => {
    const { costBenefit } = analysisData;
    
    if (!costBenefit) {
      loadCostBenefit();
      return <Loader />;
    }

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            成本效益分析
          </h3>
          <div className="mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              月度总支出
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(costBenefit.totalMonthlySpend)}
            </p>
          </div>

          {/* 类别支出排行 */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
              支出最高的类别
            </h4>
            <div className="space-y-3">
              {costBenefit.topCategories?.map((cat, index) => (
                <div key={index} className="flex items-center">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {cat.category}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatCurrency(cat.amount)} ({cat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${cat.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 优化建议 */}
          {costBenefit.recommendations && costBenefit.recommendations.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                优化建议
              </h4>
              <div className="space-y-3">
                {costBenefit.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20 rounded-lg p-3"
                  >
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      {rec.message}
                    </p>
                    {rec.potentialSavings && (
                      <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                        潜在节省: {formatCurrency(rec.potentialSavings)}/月
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRecommendations = () => {
    const { recommendations } = analysisData;
    
    if (!recommendations) return null;

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            个性化推荐
          </h3>
          
          {/* 用户画像 */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              您的订阅画像
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">订阅总数:</span>
                <p className="font-medium">{recommendations.userProfile?.totalSubscriptions}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">月度支出:</span>
                <p className="font-medium">{formatCurrency(recommendations.userProfile?.monthlySpend || 0)}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">主要类别:</span>
                <p className="font-medium">{recommendations.userProfile?.dominantCategory || '未分类'}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">支出水平:</span>
                <p className="font-medium">
                  {recommendations.userProfile?.spendingLevel === 'low' ? '低' :
                   recommendations.userProfile?.spendingLevel === 'medium' ? '中' : '高'}
                </p>
              </div>
            </div>
          </div>

          {/* 推荐列表 */}
          <div className="space-y-4">
            {recommendations.recommendations?.map((rec, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getPriorityColor(rec.priority)}`}
              >
                <div className="flex items-start">
                  <LightBulbIcon className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {rec.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {rec.description}
                    </p>
                    
                    {/* 显示相关订阅 */}
                    {rec.relatedSubscriptions && rec.relatedSubscriptions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">相关订阅：</p>
                        {rec.relatedSubscriptions.map((sub, subIndex) => (
                          <div key={subIndex} className="bg-gray-100 dark:bg-gray-700 rounded p-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                  {sub.name}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {sub.provider} • {formatCurrency(sub.amount)}/{
                                    sub.billing_cycle === 'monthly' ? '月' :
                                    sub.billing_cycle === 'yearly' ? '年' :
                                    sub.billing_cycle === 'half_yearly' ? '半年' :
                                    sub.billing_cycle === 'quarterly' ? '季度' :
                                    sub.billing_cycle === 'weekly' ? '周' :
                                    sub.billing_cycle === 'daily' ? '日' :
                                    sub.billing_cycle
                                  }
                                </p>
                              </div>
                              {sub.category && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {sub.category}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {rec.estimatedSavings && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                        预计节省: {formatCurrency(rec.estimatedSavings)}/月
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 洞察总结 */}
          {recommendations.insights && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                节省潜力分析
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                总节省潜力: {formatCurrency(recommendations.insights.savingsPotential || 0)}/月
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                可执行建议: {recommendations.insights.actionableRecommendations} 个
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'overview', name: '总览', icon: ChartBarIcon },
    { id: 'duplicates', name: '重复检测', icon: ExclamationTriangleIcon },
    { id: 'usage', name: '使用频率', icon: ClockIcon },
    { id: 'cost', name: '成本分析', icon: CurrencyDollarIcon },
    { id: 'recommendations', name: '个性化推荐', icon: LightBulbIcon }
  ];

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          智能分析
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          基于AI的订阅优化建议和成本分析
        </p>
      </div>

      {/* 标签页导航 */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center py-2 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 内容区域 */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'duplicates' && renderDuplicates()}
        {activeTab === 'usage' && renderUsageFrequency()}
        {activeTab === 'cost' && renderCostBenefit()}
        {activeTab === 'recommendations' && renderRecommendations()}
      </div>
    </div>
  );
}

export default IntelligentAnalysis;