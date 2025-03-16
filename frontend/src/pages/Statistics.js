import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import Loader from '../components/Loader';
import { statisticsAPI } from '../services/api';
import { formatCurrency, getRandomColor } from '../services/utils';

// 注册Chart.js组件
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Statistics = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('monthly'); // monthly或yearly
  
  const [stats, setStats] = useState({
    totalSpending: { amount: 0, currency: 'CNY' },
    categoryData: {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [],
          borderColor: [],
          borderWidth: 1,
        },
      ],
    },
    monthlyTrend: {
      labels: [],
      datasets: [
        {
          label: '支出',
          data: [],
          backgroundColor: 'rgba(14, 165, 233, 0.6)',
        },
      ],
    },
  });
  
  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // 获取支出数据
      const spendingRes = await (timeframe === 'monthly' 
        ? statisticsAPI.getMonthlySpending() 
        : statisticsAPI.getYearlySpending());
      
      const spendingData = spendingRes.data;
      
      // 获取按类别分组的数据
      const categoryRes = await statisticsAPI.getSpendingByCategory();
      const categoryData = categoryRes.data;
      
      // 处理类别数据用于饼图
      const categories = [];
      const categoryAmounts = [];
      const categoryColors = [];
      const categoryBorders = [];
      
      categoryData.forEach((item, index) => {
        const category = item.category || '未分类';
        const amount = item.total_amount || 0;
        
        categories.push(category);
        categoryAmounts.push(amount);
        
        const color = getRandomColor(index);
        categoryColors.push(color + '99'); // 添加透明度
        categoryBorders.push(color);
      });
      
      // 处理月度趋势数据（这需要后端支持，此处模拟）
      // 实际项目中应从后端获取
      const months = ['一月', '二月', '三月', '四月', '五月', '六月', 
                     '七月', '八月', '九月', '十月', '十一月', '十二月'];
      const randomData = months.map(() => Math.floor(Math.random() * 1000) + 100);
      
      setStats({
        totalSpending: { 
          amount: spendingData.totals.CNY || 0, 
          currency: 'CNY' 
        },
        categoryData: {
          labels: categories,
          datasets: [
            {
              data: categoryAmounts,
              backgroundColor: categoryColors,
              borderColor: categoryBorders,
              borderWidth: 1,
            },
          ],
        },
        monthlyTrend: {
          labels: months,
          datasets: [
            {
              label: timeframe === 'monthly' ? '月支出 (CNY)' : '年支出 (CNY)',
              data: randomData,
              backgroundColor: 'rgba(14, 165, 233, 0.6)',
            },
          ],
        },
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast.error('获取统计数据失败，请稍后再试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchStats();
  }, [timeframe]);
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };
  
  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
          }
        }
      }
    },
  };
  
  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: timeframe === 'monthly' ? '月度支出趋势' : '年度支出趋势',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.raw || 0;
            return `${label}: ${formatCurrency(value)}`;
          }
        }
      }
    },
  };
  
  if (loading && !refreshing) {
    return <Loader />;
  }
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-dark-600 dark:text-white">统计分析</h1>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                timeframe === 'monthly'
                  ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-600 dark:text-gray-300 dark:hover:bg-dark-500'
              }`}
              onClick={() => setTimeframe('monthly')}
            >
              月度
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                timeframe === 'yearly'
                  ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-600 dark:text-gray-300 dark:hover:bg-dark-500'
              }`}
              onClick={() => setTimeframe('yearly')}
            >
              年度
            </button>
          </div>
          
          <button
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-700 dark:text-gray-300 dark:hover:bg-dark-600"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <ArrowPathIcon className={`-ml-0.5 mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>
      
      {/* 总支出卡片 */}
      <motion.div
        className="text-center p-8 bg-white dark:bg-dark-700 rounded-lg shadow-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
          {timeframe === 'monthly' ? '每月总支出' : '每年总支出'}
        </h2>
        <div className="mt-2 text-4xl font-bold text-dark-600 dark:text-white">
          {formatCurrency(stats.totalSpending.amount, stats.totalSpending.currency)}
        </div>
      </motion.div>
      
      {/* 图表部分 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 类别饼图 */}
        <motion.div
          className="bg-white dark:bg-dark-700 rounded-lg shadow p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">按类别支出</h2>
          {stats.categoryData.labels.length > 0 ? (
            <div className="h-80">
              <Pie data={stats.categoryData} options={pieOptions} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-80 text-gray-500 dark:text-gray-400">
              没有类别数据可显示
            </div>
          )}
        </motion.div>
        
        {/* 月度趋势条形图 */}
        <motion.div
          className="bg-white dark:bg-dark-700 rounded-lg shadow p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">支出趋势</h2>
          <div className="h-80">
            <Bar data={stats.monthlyTrend} options={barOptions} />
          </div>
        </motion.div>
      </div>
      
      {/* 统计详情表格 */}
      <motion.div
        className="bg-white dark:bg-dark-700 rounded-lg shadow overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <div className="px-6 py-5 border-b border-gray-200 dark:border-dark-600">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">详细统计</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
            <thead className="bg-gray-50 dark:bg-dark-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">类别</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">订阅数量</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {timeframe === 'monthly' ? '月支出' : '年支出'}
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">占比</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-700 divide-y divide-gray-200 dark:divide-dark-600">
              {stats.categoryData.labels.map((category, index) => {
                const amount = stats.categoryData.datasets[0].data[index];
                const total = stats.categoryData.datasets[0].data.reduce((a, b) => a + b, 0);
                const percentage = ((amount / total) * 100).toFixed(1);
                
                return (
                  <tr key={category} className="hover:bg-gray-50 dark:hover:bg-dark-600">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {/* 这里应该是实际的订阅数量，此处模拟 */}
                      {Math.floor(Math.random() * 5) + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {formatCurrency(amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {percentage}%
                    </td>
                  </tr>
                );
              })}
              
              {/* 总计行 */}
              <tr className="bg-gray-50 dark:bg-dark-800">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">总计</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {/* 总订阅数量 */}
                  {stats.categoryData.datasets[0].data.reduce((a, b, i) => {
                    return a + (Math.floor(Math.random() * 5) + 1);
                  }, 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white text-right">
                  {formatCurrency(stats.totalSpending.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white text-right">
                  100%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default Statistics;
