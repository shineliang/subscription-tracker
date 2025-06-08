import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { UserIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { authAPI } from '../services/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('请输入用户名和密码');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await authAPI.login({
        username,
        password
      });
      
      // 保存token和用户信息
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', response.data.token);
      storage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('isAuthenticated', 'true');
      
      toast.success('登录成功！');
      navigate('/');
    } catch (error) {
      console.error('登录失败:', error);
      if (error.response?.status === 401) {
        toast.error('用户名或密码错误');
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('登录失败，请稍后再试');
      }
    } finally {
      setLoading(false);
    }
  };

  // 演示账号快速填充
  const fillDemoAccount = () => {
    setUsername('admin');
    setPassword('admin123');
    toast.info('已填充演示账号，密码：admin123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-dark-800 dark:to-dark-900 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8"
      >
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-dark-900 dark:text-white">
            登录您的账户
          </h2>
          <p className="mt-2 text-center text-sm text-dark-600 dark:text-dark-300">
            还没有账号？{' '}
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
              立即注册
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                用户名或邮箱
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-dark-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="appearance-none rounded-none relative block w-full pl-10 px-3 py-2 border border-dark-300 placeholder-dark-500 text-dark-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 dark:bg-dark-700 dark:border-dark-600 dark:text-white dark:placeholder-dark-400 sm:text-sm"
                  placeholder="用户名或邮箱"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                密码
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-dark-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full pl-10 px-3 py-2 border border-dark-300 placeholder-dark-500 text-dark-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 dark:bg-dark-700 dark:border-dark-600 dark:text-white dark:placeholder-dark-400 sm:text-sm"
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-dark-300 rounded dark:bg-dark-700 dark:border-dark-600"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-dark-900 dark:text-dark-300">
                记住我
              </label>
            </div>

            <div className="text-sm">
              <button
                type="button"
                onClick={fillDemoAccount}
                className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
              >
                使用演示账号
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                '登录'
              )}
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dark-300 dark:border-dark-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-dark-800 text-dark-500">或者</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-dark-600 dark:text-dark-400">
                首次使用？创建账号开始管理您的订阅
              </p>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;