import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../services/utils';

const Switch = forwardRef(({ 
  className,
  checked = false,
  onChange,
  disabled = false,
  label,
  size = 'md',
  color = 'primary',
  ...props 
}, ref) => {
  const sizes = {
    sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
    md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5' },
    lg: { track: 'w-14 h-8', thumb: 'w-7 h-7', translate: 'translate-x-6' },
  };
  
  const colors = {
    primary: 'bg-primary-500',
    secondary: 'bg-secondary-500',
    accent: 'bg-accent-500',
    success: 'bg-green-500',
    danger: 'bg-red-500',
  };
  
  const currentSize = sizes[size];
  const currentColor = colors[color];
  
  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!disabled) {
        onChange?.(!checked);
      }
    }
  };
  
  return (
    <label className={cn(
      "inline-flex items-center cursor-pointer select-none",
      disabled && "opacity-50 cursor-not-allowed",
      className
    )}>
      <div className="relative">
        <input
          ref={ref}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => !disabled && onChange?.(e.target.checked)}
          disabled={disabled}
          {...props}
        />
        
        {/* Track */}
        <motion.div
          className={cn(
            "rounded-full transition-colors duration-300",
            currentSize.track,
            checked ? currentColor : "bg-neutral-300 dark:bg-neutral-700"
          )}
          animate={{
            backgroundColor: checked ? undefined : undefined,
          }}
          whileTap={!disabled ? { scale: 0.95 } : {}}
        >
          {/* Glow effect */}
          {checked && (
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className={cn(
                "absolute inset-0 rounded-full blur-md opacity-40",
                currentColor
              )} />
            </motion.div>
          )}
        </motion.div>
        
        {/* Thumb */}
        <motion.div
          className={cn(
            "absolute top-0.5 left-0.5 rounded-full bg-white shadow-lg",
            currentSize.thumb
          )}
          animate={{
            x: checked ? `calc(${currentSize.track.split(' ')[0]} - ${currentSize.thumb.split(' ')[0]} - 0.25rem)` : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
          whileHover={!disabled ? { scale: 1.1 } : {}}
        >
          {/* Inner decoration */}
          <motion.div
            className="absolute inset-0 rounded-full flex items-center justify-center"
            animate={{
              scale: checked ? 1 : 0,
              opacity: checked ? 1 : 0,
            }}
            transition={{
              duration: 0.2,
            }}
          >
            <svg 
              className={cn("w-3 h-3", currentColor)} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </motion.div>
        </motion.div>
      </div>
      
      {/* Label */}
      {label && (
        <span className={cn(
          "ml-3 text-neutral-700 dark:text-neutral-300",
          size === 'sm' && "text-sm",
          size === 'lg' && "text-lg"
        )}>
          {label}
        </span>
      )}
    </label>
  );
});

Switch.displayName = 'Switch';

// Toggle group component
export const ToggleGroup = ({ 
  options = [], 
  value, 
  onChange, 
  size = 'md',
  variant = 'default',
  className 
}) => {
  const variants = {
    default: 'bg-neutral-100 dark:bg-neutral-800',
    glass: 'glass-morphism',
  };
  
  return (
    <div className={cn(
      "inline-flex rounded-xl p-1",
      variants[variant],
      className
    )}>
      {options.map((option) => (
        <motion.button
          key={option.value}
          className={cn(
            "relative px-4 py-2 text-sm font-medium rounded-lg transition-colors",
            value === option.value
              ? "text-white"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          )}
          onClick={() => onChange?.(option.value)}
          whileTap={{ scale: 0.95 }}
        >
          {value === option.value && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg"
              layoutId="toggle-background"
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
              }}
            />
          )}
          <span className="relative z-10">{option.label}</span>
        </motion.button>
      ))}
    </div>
  );
};

export { Switch };