import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Loader = ({ 
  size = 'md', 
  variant = 'dots', // dots, pulse, orbit, morph
  fullScreen = false,
  text = '',
  className = '' 
}) => {
  const sizeMap = {
    sm: { container: 32, dot: 8 },
    md: { container: 48, dot: 12 },
    lg: { container: 64, dot: 16 },
    xl: { container: 96, dot: 24 }
  };
  
  const currentSize = sizeMap[size] || sizeMap.md;
  
  // Premium loading animations
  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
                style={{ width: currentSize.dot, height: currentSize.dot }}
                animate={{
                  y: [0, -currentSize.dot, 0],
                  scale: [1, 0.8, 1],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        );
        
      case 'pulse':
        return (
          <motion.div
            className="relative"
            style={{ width: currentSize.container, height: currentSize.container }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500"
                animate={{
                  scale: [0, 1.5],
                  opacity: [0.8, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: "easeOut",
                }}
              />
            ))}
            <div 
              className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 animate-pulse"
              style={{ 
                width: currentSize.dot * 2, 
                height: currentSize.dot * 2,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            />
          </motion.div>
        );
        
      case 'orbit':
        return (
          <div 
            className="relative"
            style={{ width: currentSize.container, height: currentSize.container }}
          >
            <motion.div
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
                  style={{
                    width: currentSize.dot,
                    height: currentSize.dot,
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) rotate(${i * 90}deg) translateY(-${currentSize.container / 2}px)`,
                  }}
                  animate={{
                    scale: [1, 1.5, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.25,
                  }}
                />
              ))}
            </motion.div>
          </div>
        );
        
      case 'morph':
        return (
          <motion.div
            className="bg-gradient-to-r from-primary-500 to-secondary-500"
            style={{ width: currentSize.container, height: currentSize.container }}
            animate={{
              borderRadius: ["20%", "50%", "20%"],
              rotate: [0, 180, 360],
              scale: [1, 0.8, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        );
        
      default:
        return null;
    }
  };
  
  const loaderContent = (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {renderLoader()}
      {text && (
        <motion.p 
          className="text-sm font-medium text-neutral-600 dark:text-neutral-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
  
  if (fullScreen) {
    return (
      <AnimatePresence>
        <motion.div 
          className="fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-md z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {loaderContent}
        </motion.div>
      </AnimatePresence>
    );
  }
  
  return (
    <div className="flex items-center justify-center py-8">
      {loaderContent}
    </div>
  );
};

// Skeleton loader for content placeholders
export const SkeletonLoader = ({ className = '', lines = 3, animate = true }) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-neutral-200 dark:bg-neutral-800 rounded-lg ${animate ? 'skeleton' : ''}`}
          style={{ width: `${100 - (i * 15)}%` }}
        />
      ))}
    </div>
  );
};

export default Loader;
