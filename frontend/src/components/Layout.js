import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  HomeIcon, 
  ListBulletIcon, 
  PlusIcon, 
  ChartBarIcon, 
  Cog6ToothIcon,
  BellIcon,
  SunIcon,
  MoonIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { authAPI } from '../services/api';

const Layout = ({ darkMode, setDarkMode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const navigation = [
    { name: '仪表盘', icon: HomeIcon, href: '/' },
    { name: '所有订阅', icon: ListBulletIcon, href: '/subscriptions' },
    { name: '添加订阅', icon: PlusIcon, href: '/subscriptions/add' },
    { name: '付款历史', icon: CurrencyDollarIcon, href: '/payments' },
    { name: '统计分析', icon: ChartBarIcon, href: '/statistics' },
    { name: '设置', icon: Cog6ToothIcon, href: '/settings' },
  ];
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleDarkMode = () => setDarkMode(!darkMode);
  
  const handleLogout = async () => {
    try {
      // 调用登出API
      await authAPI.logout();
    } catch (error) {
      console.error('登出失败:', error);
    }
    
    // 清除本地存储
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    
    navigate('/login');
  };
  
  // 获取用户信息
  const getUserInfo = () => {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  };
  
  const user = getUserInfo();
  
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-800 transition-colors duration-300">
      {/* 移动端侧边栏 */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${
          sidebarOpen ? 'block' : 'hidden'
        }`}
        onClick={toggleSidebar}
      >
        <div className="fixed inset-0 bg-black/50" aria-hidden="true"></div>
        <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-dark-700 shadow-lg transform transition ease-in-out duration-300">
          <div className="flex items-center justify-between h-16 px-4 border-b dark:border-dark-600">
            <Link to="/" className="flex items-center">
              <BellIcon className="h-8 w-8 text-primary-500" />
              <span className="ml-2 text-xl font-semibold text-dark-500 dark:text-white">订阅管家</span>
            </Link>
            <button
              className="p-1 rounded-md text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-white"
              onClick={toggleSidebar}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="mt-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-4 py-3 text-sm ${
                  location.pathname === item.href
                    ? 'bg-primary-50 text-primary-600 border-r-4 border-primary-500 dark:bg-dark-600 dark:text-primary-400'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-dark-600'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 ${
                    location.pathname === item.href
                      ? 'text-primary-500 dark:text-primary-400'
                      : 'text-gray-500 group-hover:text-gray-600 dark:text-gray-400 dark:group-hover:text-gray-300'
                  }`}
                />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t dark:border-dark-600">
            {user && (
              <div className="flex items-center space-x-3 mb-3">
                <UserCircleIcon className="h-10 w-10 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.full_name || user.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
              退出登录
            </button>
          </div>
        </div>
      </div>

      {/* 桌面端侧边栏 */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-gray-200 dark:border-dark-700">
        <div className="flex flex-col flex-1 h-full bg-white dark:bg-dark-700 transition-colors duration-300">
          <div className="flex items-center h-16 px-4 border-b dark:border-dark-600">
            <Link to="/" className="flex items-center">
              <BellIcon className="h-8 w-8 text-primary-500" />
              <span className="ml-2 text-xl font-semibold text-dark-500 dark:text-white">订阅管家</span>
            </Link>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-2 py-3 text-sm font-medium rounded-md transition-all duration-200 ${
                  location.pathname === item.href
                    ? 'bg-primary-50 text-primary-600 dark:bg-dark-600 dark:text-primary-400'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-dark-600'
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 ${
                    location.pathname === item.href
                      ? 'text-primary-500 dark:text-primary-400'
                      : 'text-gray-500 group-hover:text-gray-600 dark:text-gray-400 dark:group-hover:text-gray-300'
                  }`}
                />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t dark:border-dark-600">
            {user && (
              <div className="flex items-center space-x-3 mb-4">
                <UserCircleIcon className="h-10 w-10 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.full_name || user.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={toggleDarkMode}
              className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-dark-600 mb-2"
            >
              {darkMode ? (
                <>
                  <SunIcon className="h-5 w-5 mr-3 text-yellow-500" />
                  切换亮色模式
                </>
              ) : (
                <>
                  <MoonIcon className="h-5 w-5 mr-3 text-indigo-500" />
                  切换暗色模式
                </>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
              退出登录
            </button>
          </div>
        </div>
      </aside>

      {/* 内容区域 */}
      <div className="flex flex-col flex-1 lg:pl-64">
        {/* 顶部导航 */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white dark:bg-dark-700 border-b border-gray-200 dark:border-dark-600 transition-colors duration-300">
          <div className="flex items-center lg:hidden">
            <button
              className="p-1 rounded-md text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-white focus:outline-none"
              onClick={toggleSidebar}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <span className="ml-2 text-lg font-semibold text-dark-500 dark:text-white">订阅管家</span>
          </div>
          <div className="flex items-center lg:hidden ml-auto space-x-2">
            {user && (
              <div className="flex items-center space-x-2 mr-2">
                <UserCircleIcon className="h-6 w-6 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                  {user.username}
                </span>
              </div>
            )}
            <button
              onClick={toggleDarkMode}
              className="p-1 rounded-md text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-white focus:outline-none"
            >
              {darkMode ? (
                <SunIcon className="h-6 w-6 text-yellow-500" />
              ) : (
                <MoonIcon className="h-6 w-6 text-indigo-500" />
              )}
            </button>
          </div>
        </header>

        {/* 主内容 */}
        <main className="flex-1 overflow-y-auto">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
