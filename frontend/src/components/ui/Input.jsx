import React, { forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cva } from 'class-variance-authority';
import { cn } from '../../services/utils';

const inputVariants = cva(
  'relative w-full rounded-xl transition-all duration-300 font-medium placeholder:text-neutral-400 dark:placeholder:text-neutral-500',
  {
    variants: {
      variant: {
        default: 'bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white',
        glass: 'glass-morphism text-neutral-900 dark:text-white',
        filled: 'bg-neutral-100 dark:bg-neutral-800 border-2 border-transparent text-neutral-900 dark:text-white',
        underline: 'bg-transparent border-b-2 border-neutral-300 dark:border-neutral-700 rounded-none px-0 text-neutral-900 dark:text-white',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-base',
        lg: 'h-13 px-5 text-lg',
      },
      state: {
        default: '',
        focused: 'ring-2 ring-primary-500 ring-offset-2 border-primary-500',
        error: 'border-red-500 dark:border-red-400',
        success: 'border-green-500 dark:border-green-400',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      state: 'default',
    },
  }
);

const Input = forwardRef(({ 
  className,
  variant,
  size,
  type = 'text',
  label,
  error,
  success,
  helperText,
  icon,
  iconPosition = 'left',
  floatingLabel = true,
  magnetic = true,
  onFocus,
  onBlur,
  ...props 
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const inputRef = React.useRef(null);
  
  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };
  
  const handleBlur = (e) => {
    setIsFocused(false);
    setHasValue(e.target.value !== '');
    onBlur?.(e);
  };
  
  const handleChange = (e) => {
    setHasValue(e.target.value !== '');
    props.onChange?.(e);
  };
  
  // Magnetic cursor effect
  const handleMouseMove = (e) => {
    if (!magnetic || !inputRef.current) return;
    
    const rect = inputRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const deltaX = (x - centerX) / centerX;
    const deltaY = (y - centerY) / centerY;
    
    const skewX = deltaX * 2;
    const skewY = deltaY * 1;
    
    inputRef.current.style.transform = `perspective(1000px) rotateX(${-skewY}deg) rotateY(${skewX}deg) scale(1.01)`;
  };
  
  const handleMouseLeave = () => {
    if (!magnetic || !inputRef.current) return;
    inputRef.current.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
  };
  
  const state = error ? 'error' : success ? 'success' : 'default';
  
  return (
    <div className="relative">
      {/* Static label for non-floating variant */}
      {label && !floatingLabel && (
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          {label}
        </label>
      )}
      
      <div 
        className="relative"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Icon */}
        {icon && (
          <div className={cn(
            "absolute top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 pointer-events-none z-10",
            iconPosition === 'left' ? 'left-4' : 'right-4',
            size === 'sm' && (iconPosition === 'left' ? 'left-3' : 'right-3'),
            size === 'lg' && (iconPosition === 'left' ? 'left-5' : 'right-5'),
          )}>
            <motion.div
              animate={{ 
                scale: isFocused ? 1.1 : 1,
                color: isFocused ? 'rgb(139, 92, 246)' : undefined,
              }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              {icon}
            </motion.div>
          </div>
        )}
        
        {/* Input field */}
        <input
          ref={(el) => {
            inputRef.current = el;
            if (ref) ref.current = el;
          }}
          type={type}
          className={cn(
            inputVariants({ variant, size, state }),
            icon && iconPosition === 'left' && 'pl-12',
            icon && iconPosition === 'right' && 'pr-12',
            floatingLabel && label && 'pt-6 pb-2',
            className
          )}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          placeholder={!floatingLabel || !label ? props.placeholder : ''}
          {...props}
        />
        
        {/* Floating label */}
        {label && floatingLabel && (
          <motion.label
            className={cn(
              "absolute left-4 text-neutral-600 dark:text-neutral-400 pointer-events-none origin-left",
              icon && iconPosition === 'left' && 'left-12',
            )}
            initial={false}
            animate={{
              y: isFocused || hasValue || props.value ? '0.5rem' : '50%',
              scale: isFocused || hasValue || props.value ? 0.75 : 1,
              color: isFocused ? 'rgb(139, 92, 246)' : undefined,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{
              translateY: '-50%',
            }}
          >
            {label}
          </motion.label>
        )}
        
        {/* Focus highlight */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isFocused ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          style={{ originX: 0.5 }}
        />
        
        {/* Glow effect */}
        <AnimatePresence>
          {isFocused && (
            <motion.div
              className="absolute inset-0 rounded-xl pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/20 to-secondary-500/20 blur-xl" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Helper text */}
      <AnimatePresence mode="wait">
        {(error || success || helperText) && (
          <motion.p
            className={cn(
              "mt-2 text-sm",
              error && "text-red-500 dark:text-red-400",
              success && "text-green-500 dark:text-green-400",
              !error && !success && "text-neutral-500 dark:text-neutral-400"
            )}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {error || success || helperText}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});

Input.displayName = 'Input';

// Textarea variant
export const Textarea = forwardRef(({ className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      as="textarea"
      className={cn("min-h-[100px] resize-y", className)}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';

// Search input with built-in icon
export const SearchInput = forwardRef(({ className, ...props }, ref) => {
  const SearchIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
  
  return (
    <Input
      ref={ref}
      type="search"
      icon={<SearchIcon />}
      iconPosition="left"
      className={className}
      {...props}
    />
  );
});

SearchInput.displayName = 'SearchInput';

export { Input, inputVariants };