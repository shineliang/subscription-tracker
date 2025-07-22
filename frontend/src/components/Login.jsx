import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { UserIcon, LockClosedIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { authAPI } from '../services/api';
import Card from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Switch } from './ui/Switch';
import { staggerContainer, staggerItem } from '../utils/animations';

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50 dark:from-black dark:via-neutral-950 dark:to-primary-950">
        <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
      </div>
      
      {/* Floating orbs */}
      <motion.div
        className="absolute top-20 left-20 w-72 h-72 bg-primary-500/20 rounded-full blur-3xl"
        animate={{
          x: [0, 100, 0],
          y: [0, -100, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <motion.div
        className="absolute bottom-20 right-20 w-96 h-96 bg-secondary-500/20 rounded-full blur-3xl"
        animate={{
          x: [0, -100, 0],
          y: [0, 100, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-md w-full px-6"
      >
        <motion.div variants={staggerItem} className="text-center mb-8">
          <motion.h2 
            className="text-4xl font-display font-bold text-gradient-animate mb-2"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            欢迎回来
          </motion.h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            还没有账号？{' '}
            <Link to="/register" className="font-medium text-primary-500 hover:text-primary-400 transition-colors">
              立即注册
            </Link>
          </p>
        </motion.div>
        <Card variant="glass" padding="lg" glow>
          <form className="space-y-6" onSubmit={handleLogin}>
            <motion.div variants={staggerItem}>
              <Input
                id="username"
                name="username"
                type="text"
                label="用户名或邮箱"
                icon={<UserIcon className="w-5 h-5" />}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                variant="glass"
              />
            </motion.div>
            
            <motion.div variants={staggerItem}>
              <Input
                id="password"
                name="password"
                type="password"
                label="密码"
                icon={<LockClosedIcon className="w-5 h-5" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                variant="glass"
              />
            </motion.div>

            <motion.div variants={staggerItem} className="flex items-center justify-between">
              <Switch
                id="remember-me"
                checked={rememberMe}
                onChange={setRememberMe}
                label="记住我"
                size="sm"
              />
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={fillDemoAccount}
                icon={<SparklesIcon className="w-4 h-4" />}
                iconPosition="left"
              >
                演示账号
              </Button>
            </motion.div>

            <motion.div variants={staggerItem}>
              <Button
                type="submit"
                variant="gradient"
                size="lg"
                className="w-full"
                loading={loading}
                glow
              >
                登录账户
              </Button>
            </motion.div>

            <motion.div variants={staggerItem} className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/50 dark:bg-black/50 backdrop-blur-sm text-neutral-500 rounded-full">
                  或者
                </span>
              </div>
            </motion.div>
            
            <motion.div variants={staggerItem} className="text-center">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                首次使用？创建账号开始管理您的订阅
              </p>
            </motion.div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;