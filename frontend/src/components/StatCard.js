import React from 'react';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon, color, footer }) => {
  // 自定义卡片颜色样式
  const colorClasses = {
    primary: 'from-primary-400 to-primary-600',
    secondary: 'from-secondary-400 to-secondary-600',
    accent: 'from-accent-400 to-accent-600',
    info: 'from-blue-400 to-blue-600',
    success: 'from-green-400 to-green-600',
    warning: 'from-amber-400 to-amber-600',
    danger: 'from-red-400 to-red-600',
    purple: 'from-purple-400 to-purple-600',
    indigo: 'from-indigo-400 to-indigo-600',
    cyan: 'from-cyan-400 to-cyan-600',
  };
  
  const gradientClass = colorClasses[color] || colorClasses.primary;
  
  return (
    <motion.div 
      className="card card-hover h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">{title}</h3>
          <div className={`p-2 rounded-lg bg-gradient-to-r ${gradientClass}`}>
            {icon && <span className="text-white">{icon}</span>}
          </div>
        </div>
        <div className="mb-4">
          <div className="text-3xl font-bold text-dark-600 dark:text-white">{value}</div>
        </div>
        {footer && (
          <div className="text-sm text-gray-500 dark:text-gray-400">{footer}</div>
        )}
      </div>
    </motion.div>
  );
};

export default StatCard;
