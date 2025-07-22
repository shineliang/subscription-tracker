import React from 'react';
import { motion } from 'framer-motion';
import Card from './ui/Card';

const StatCard = ({ title, value, icon, color, footer, trend, trendDirection = 'up' }) => {
  // Premium gradient backgrounds for icons
  const iconGradients = {
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
  
  const gradientClass = iconGradients[color] || iconGradients.primary;
  
  // Trend colors
  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-gray-500'
  };
  
  return (
    <Card 
      variant="glass" 
      hover 
      glow={false}
      elevation="medium"
      className="h-full relative overflow-visible"
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 opacity-5">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} animate-pulse-slow`} />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              {title}
            </h3>
            <motion.div 
              className="text-3xl font-bold font-display text-neutral-900 dark:text-white"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                delay: 0.1,
                type: "spring",
                stiffness: 200,
                damping: 20
              }}
            >
              {value}
            </motion.div>
          </div>
          
          {/* Premium icon container */}
          <motion.div
            className="relative"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <div className={`p-3 rounded-2xl bg-gradient-to-br ${gradientClass} shadow-lg`}>
              {icon && <span className="text-white block">{icon}</span>}
            </div>
            {/* Icon glow effect */}
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradientClass} blur-xl opacity-40`} />
          </motion.div>
        </div>
        
        {/* Footer section with trend */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-200/50 dark:border-neutral-700/50">
          {footer && (
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              {footer}
            </div>
          )}
          
          {trend && (
            <motion.div 
              className={`flex items-center text-sm font-medium ${trendColors[trendDirection]}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {trendDirection === 'up' && (
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              )}
              {trendDirection === 'down' && (
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              )}
              {trend}
            </motion.div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default StatCard;
