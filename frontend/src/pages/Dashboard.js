import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { 
  CreditCardIcon, 
  CalendarIcon, 
  ArrowTrendingUpIcon, 
  BanknotesIcon,
  ArrowLongRightIcon
} from '@heroicons/react/24/outline';
import StatCard from '../components/StatCard';
import SubscriptionCard from '../components/SubscriptionCard';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { subscriptionAPI, statisticsAPI } from '../services/api';
import { formatCurrency } from '../services/utils';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [upcomingSubscriptions, setUpcomingSubscriptions] = useState([]);
  const [stats, setStats] = useState({
    totalMonthly: { amount: 0, currency: 'CNY' },
    totalYearly: { amount: 0, currency: 'CNY' },
    totalActive: 0,
    expiringThisWeek: 0
  });
  
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 获取即将到期的订阅
      const upcomingRes = await subscriptionAPI.getUpcoming(7);
      setUpcomingSubscriptions(upcomingRes.data);
      
      // 获取所有订阅
      const allSubscriptionsRes = await subscriptionAPI.getAll();
      const allSubscriptions = allSubscriptionsRes.data;
      
      // 获取月度支出
      const monthlyRes = await statisticsAPI.getMonthlySpending();
      const monthlyData = monthlyRes.data;
      
      // 获取年度支出
      const yearlyRes = await statisticsAPI.getYearlySpending();
      const yearlyData = yearlyRes.data;
      
      // 计算统计数据
      setStats({
        totalMonthly: { 
          amount: monthlyData.totals.CNY || 0, 
          currency: 'CNY' 
        },
        totalYearly: { 
          amount: yearlyData.totals.CNY || 0, 
          currency: 'CNY' 
        },
        totalActive: allSubscriptions.filter(sub => sub.active).length,
        expiringThisWeek: upcomingRes.data.length
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('获取数据失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      try {
        setLoading(true);
        
        // 获取即将到期的订阅
        const upcomingRes = await subscriptionAPI.getUpcoming(7);
        
        // 获取所有订阅
        const allSubscriptionsRes = await subscriptionAPI.getAll();
        const allSubscriptions = allSubscriptionsRes.data;
        
        // 获取月度支出
        const monthlyRes = await statisticsAPI.getMonthlySpending();
        const monthlyData = monthlyRes.data;
        
        // 获取年度支出
        const yearlyRes = await statisticsAPI.getYearlySpending();
        const yearlyData = yearlyRes.data;
        
        if (mounted) {
          setUpcomingSubscriptions(upcomingRes.data);
          
          // 计算统计数据
          setStats({
            totalMonthly: { 
              amount: monthlyData.totals.CNY || 0, 
              currency: 'CNY' 
            },
            totalYearly: { 
              amount: yearlyData.totals.CNY || 0, 
              currency: 'CNY' 
            },
            totalActive: allSubscriptions.filter(sub => sub.active).length,
            expiringThisWeek: upcomingRes.data.length
          });
        }
      } catch (error) {
        if (mounted) {
          console.error('Error fetching dashboard data:', error);
          toast.error('获取数据失败，请稍后再试');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
    };
  }, []);
  
  const handleDelete = async (id) => {
    try {
      await subscriptionAPI.delete(id);
      setUpcomingSubscriptions(upcomingSubscriptions.filter(sub => sub.id !== id));
      toast.success('订阅已删除');
      fetchData(); // 刷新数据
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast.error('删除失败，请稍后再试');
    }
  };
  
  if (loading) {
    return <Loader />;
  }
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark-600 dark:text-white">仪表盘</h1>
        <Link
          to="/subscriptions/add"
          className="btn-primary"
        >
          添加新订阅
        </Link>
      </div>
      
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="月度支出" 
          value={formatCurrency(stats.totalMonthly.amount, stats.totalMonthly.currency)}
          icon={<BanknotesIcon className="h-6 w-6" />}
          color="primary"
          footer="每月订阅总费用"
        />
        <StatCard 
          title="年度支出" 
          value={formatCurrency(stats.totalYearly.amount, stats.totalYearly.currency)}
          icon={<ArrowTrendingUpIcon className="h-6 w-6" />}
          color="secondary"
          footer="每年订阅总费用"
        />
        <StatCard 
          title="活跃订阅" 
          value={stats.totalActive}
          icon={<CreditCardIcon className="h-6 w-6" />}
          color="accent"
          footer="当前活跃订阅数量"
        />
        <StatCard 
          title="即将到期" 
          value={stats.expiringThisWeek}
          icon={<CalendarIcon className="h-6 w-6" />}
          color="warning"
          footer="7天内即将到期的订阅"
        />
      </div>
      
      {/* 即将到期的订阅 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-dark-600 dark:text-white">即将到期的订阅</h2>
          <Link 
            to="/subscriptions"
            className="flex items-center text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
          >
            查看全部
            <ArrowLongRightIcon className="ml-1 h-4 w-4" />
          </Link>
        </div>
        
        {upcomingSubscriptions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingSubscriptions.map((subscription) => (
              <SubscriptionCard 
                key={subscription.id}
                subscription={subscription}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <EmptyState 
              title="没有即将到期的订阅"
              description="添加新的订阅以便我们提醒您即将到期的付款"
              icon={<CalendarIcon className="h-12 w-12 text-primary-500" />}
              actionLink="/subscriptions/add"
              actionText="添加订阅"
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
