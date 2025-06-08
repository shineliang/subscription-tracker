import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { UserIcon, EnvelopeIcon, LockClosedIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { authAPI } from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    // 验证用户名
    if (!formData.username) {
      newErrors.username = '用户名不能为空';
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(formData.username)) {
      newErrors.username = '用户名必须为3-20个字符，只能包含字母、数字和下划线';
    }
    
    // 验证邮箱
    if (!formData.email) {
      newErrors.email = '邮箱不能为空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '邮箱格式无效';
    }
    
    // 验证密码
    if (!formData.password) {
      newErrors.password = '密码不能为空';
    } else if (formData.password.length < 6) {
      newErrors.password = '密码长度至少为6个字符';
    }
    
    // 验证确认密码
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '请确认密码';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 清除对应字段的错误
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await authAPI.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName
      });
      
      // 保存token和用户信息
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('isAuthenticated', 'true');
      
      toast.success('注册成功！');
      navigate('/');
    } catch (error) {
      console.error('注册失败:', error);
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('注册失败，请稍后再试');
      }
    } finally {
      setLoading(false);
    }
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
            创建新账号
          </h2>
          <p className="mt-2 text-center text-sm text-dark-600 dark:text-dark-300">
            已有账号？{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
              立即登录
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* 用户名 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-dark-700 dark:text-dark-300">
                用户名 <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-dark-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className={`appearance-none block w-full pl-10 pr-3 py-2 border ${
                    errors.username ? 'border-red-300' : 'border-dark-300'
                  } rounded-md shadow-sm placeholder-dark-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white sm:text-sm`}
                  placeholder="选择一个用户名"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            {/* 邮箱 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-dark-700 dark:text-dark-300">
                邮箱地址 <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-dark-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`appearance-none block w-full pl-10 pr-3 py-2 border ${
                    errors.email ? 'border-red-300' : 'border-dark-300'
                  } rounded-md shadow-sm placeholder-dark-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white sm:text-sm`}
                  placeholder="your@email.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* 全名 */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-dark-700 dark:text-dark-300">
                全名（可选）
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-dark-400" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-dark-300 rounded-md shadow-sm placeholder-dark-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white sm:text-sm"
                  placeholder="您的姓名"
                />
              </div>
            </div>

            {/* 密码 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-dark-700 dark:text-dark-300">
                密码 <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-dark-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none block w-full pl-10 pr-3 py-2 border ${
                    errors.password ? 'border-red-300' : 'border-dark-300'
                  } rounded-md shadow-sm placeholder-dark-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white sm:text-sm`}
                  placeholder="至少6个字符"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* 确认密码 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-dark-700 dark:text-dark-300">
                确认密码 <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-dark-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`appearance-none block w-full pl-10 pr-3 py-2 border ${
                    errors.confirmPassword ? 'border-red-300' : 'border-dark-300'
                  } rounded-md shadow-sm placeholder-dark-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white sm:text-sm`}
                  placeholder="再次输入密码"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
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
                <>
                  <UserPlusIcon className="h-5 w-5 mr-2" />
                  注册
                </>
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-dark-600 dark:text-dark-400">
              注册即表示您同意我们的服务条款和隐私政策
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Register;