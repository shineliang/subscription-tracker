import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HomeIcon } from '@heroicons/react/24/outline';

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-9xl font-bold text-primary-500 dark:text-primary-400">404</h1>
        <h2 className="mt-4 text-3xl font-bold text-dark-600 dark:text-white">页面未找到</h2>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-md mx-auto">
          抱歉，您访问的页面不存在或已被移除
        </p>
        
        <div className="mt-8">
          <Link
            to="/"
            className="btn-primary inline-flex items-center"
          >
            <HomeIcon className="mr-2 h-5 w-5" />
            返回首页
          </Link>
        </div>
      </motion.div>
      
      <motion.div
        className="mt-12 w-full max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="p-4 bg-gray-50 dark:bg-dark-600 rounded-lg">
          <h3 className="text-lg font-medium text-dark-600 dark:text-white">您可能想要前往</h3>
          <ul className="mt-3 grid grid-cols-2 gap-3">
            <li>
              <Link
                to="/"
                className="block p-3 text-center text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-dark-700 rounded-md transition-colors"
              >
                仪表盘
              </Link>
            </li>
            <li>
              <Link
                to="/subscriptions"
                className="block p-3 text-center text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-dark-700 rounded-md transition-colors"
              >
                所有订阅
              </Link>
            </li>
            <li>
              <Link
                to="/subscriptions/add"
                className="block p-3 text-center text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-dark-700 rounded-md transition-colors"
              >
                添加订阅
              </Link>
            </li>
            <li>
              <Link
                to="/statistics"
                className="block p-3 text-center text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-dark-700 rounded-md transition-colors"
              >
                统计分析
              </Link>
            </li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
