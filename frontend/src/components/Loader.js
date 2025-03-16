import React from 'react';

const Loader = ({ size = 'md', color = 'primary', fullScreen = false }) => {
  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  }[size] || 'w-12 h-12';
  
  const colorClass = {
    primary: 'border-primary-500',
    secondary: 'border-secondary-500',
    accent: 'border-accent-500',
    white: 'border-white',
    gray: 'border-gray-500'
  }[color] || 'border-primary-500';
  
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm z-50">
        <div className={`${sizeClass} loader`}>
          <div className={`animate-spin rounded-full h-full w-full border-b-2 ${colorClass}`}></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center py-8">
      <div className={`${sizeClass} loader`}>
        <div className={`animate-spin rounded-full h-full w-full border-b-2 ${colorClass}`}></div>
      </div>
    </div>
  );
};

export default Loader;
