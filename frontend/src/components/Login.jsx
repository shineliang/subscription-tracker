import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { CreditCardIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { authAPI } from '../services/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    toast.info('已填充演示账号');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and title */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <CreditCardIcon className="w-7 h-7 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              欢迎回来
            </h2>
            <p className="text-gray-600">
              还没有账号？{' '}
              <Link to="/register" className="font-medium text-blue-500 hover:text-blue-400 transition-colors">
                立即注册
              </Link>
            </p>
          </div>

          {/* Login form */}
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="用户名或邮箱"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
              
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="appearance-none relative block w-full px-4 py-3 pr-12 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  记住我
                </label>
              </div>

              <div className="text-sm">
                <button
                  type="button"
                  onClick={fillDemoAccount}
                  className="font-medium text-blue-500 hover:text-blue-400 transition-colors"
                >
                  使用演示账号
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${
                  loading 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                } transition-colors`}
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                登录即表示同意我们的服务条款和隐私政策
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Right side - Decorative pattern */}
      <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-white">
            <div className="mb-8">
              <CreditCardIcon className="w-20 h-20 mx-auto mb-6 opacity-80" />
              <h3 className="text-3xl font-bold mb-4">订阅管家</h3>
              <p className="text-xl opacity-90 leading-relaxed">
                智能管理您的所有订阅服务<br />
                追踪费用，永不错过续费提醒
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl font-bold">500+</div>
                <div className="text-sm opacity-80">支持的服务</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl font-bold">99%</div>
                <div className="text-sm opacity-80">准确率</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Pattern elements */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-white/5 rounded-full"></div>
        <div className="absolute bottom-10 left-10 w-48 h-48 bg-white/5 rounded-full"></div>
        <div className="absolute top-1/2 right-20 w-20 h-20 bg-white/5 rounded-full"></div>
      </div>
    </div>
  );
};

export default Login;