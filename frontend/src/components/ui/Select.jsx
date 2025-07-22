import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cva } from 'class-variance-authority';
import { cn } from '../../services/utils';

const selectVariants = cva(
  'relative w-full rounded-xl transition-all duration-300 font-medium cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white',
        glass: 'glass-morphism text-neutral-900 dark:text-white',
        filled: 'bg-neutral-100 dark:bg-neutral-800 border-2 border-transparent text-neutral-900 dark:text-white',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-base',
        lg: 'h-13 px-5 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

const Select = forwardRef(({ 
  className,
  variant,
  size,
  label,
  options = [],
  value,
  onChange,
  placeholder = '请选择',
  error,
  helperText,
  icon,
  floatingLabel = true,
  searchable = false,
  multiple = false,
  ...props 
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedValues, setSelectedValues] = useState(multiple ? [] : null);
  const selectRef = useRef(null);
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    if (multiple && value) {
      setSelectedValues(Array.isArray(value) ? value : [value]);
    } else {
      setSelectedValues(value);
    }
  }, [value, multiple]);
  
  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectRef.current && !selectRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const filteredOptions = searchable
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;
  
  const handleSelect = (option) => {
    if (multiple) {
      const newValues = selectedValues.includes(option.value)
        ? selectedValues.filter(v => v !== option.value)
        : [...selectedValues, option.value];
      setSelectedValues(newValues);
      onChange?.(newValues);
    } else {
      setSelectedValues(option.value);
      onChange?.(option.value);
      setIsOpen(false);
    }
  };
  
  const getDisplayValue = () => {
    if (multiple) {
      if (!selectedValues || selectedValues.length === 0) return placeholder;
      const selectedLabels = options
        .filter(opt => selectedValues.includes(opt.value))
        .map(opt => opt.label);
      return selectedLabels.length > 2 
        ? `已选择 ${selectedLabels.length} 项`
        : selectedLabels.join(', ');
    } else {
      const selected = options.find(opt => opt.value === selectedValues);
      return selected ? selected.label : placeholder;
    }
  };
  
  const hasValue = multiple ? selectedValues?.length > 0 : selectedValues !== null;
  
  return (
    <div className="relative" ref={selectRef}>
      {/* Static label */}
      {label && !floatingLabel && (
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          {label}
        </label>
      )}
      
      {/* Select trigger */}
      <motion.div
        className={cn(
          selectVariants({ variant, size }),
          'flex items-center justify-between',
          floatingLabel && label && 'pt-6 pb-2',
          error && 'border-red-500 dark:border-red-400',
          className
        )}
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.98 }}
      >
        {/* Icon */}
        {icon && (
          <div className="mr-3 text-neutral-400 dark:text-neutral-500">
            {icon}
          </div>
        )}
        
        {/* Display value */}
        <span className={cn(
          "flex-1 text-left truncate",
          !hasValue && "text-neutral-400 dark:text-neutral-500"
        )}>
          {getDisplayValue()}
        </span>
        
        {/* Dropdown arrow */}
        <motion.svg
          className="w-5 h-5 text-neutral-400 dark:text-neutral-500 ml-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
        
        {/* Floating label */}
        {label && floatingLabel && (
          <motion.label
            className={cn(
              "absolute left-4 text-neutral-600 dark:text-neutral-400 pointer-events-none origin-left",
              icon && 'left-12',
            )}
            initial={false}
            animate={{
              y: hasValue || isOpen ? '0.5rem' : '50%',
              scale: hasValue || isOpen ? 0.75 : 1,
              color: isOpen ? 'rgb(139, 92, 246)' : undefined,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{
              translateY: '-50%',
            }}
          >
            {label}
          </motion.label>
        )}
      </motion.div>
      
      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-2 overflow-hidden rounded-xl shadow-xl glass-morphism"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            {/* Search input */}
            {searchable && (
              <div className="p-2 border-b border-neutral-200 dark:border-neutral-800">
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm bg-transparent outline-none placeholder-neutral-400 dark:placeholder-neutral-500"
                  placeholder="搜索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            
            {/* Options list */}
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => {
                  const isSelected = multiple 
                    ? selectedValues?.includes(option.value)
                    : selectedValues === option.value;
                  
                  return (
                    <motion.div
                      key={option.value}
                      className={cn(
                        "px-4 py-3 cursor-pointer transition-colors",
                        "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                        isSelected && "bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400"
                      )}
                      onClick={() => handleSelect(option)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ x: 5 }}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option.label}</span>
                        {multiple && isSelected && (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="px-4 py-3 text-neutral-500 dark:text-neutral-400 text-center">
                  无匹配选项
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Helper text */}
      {(error || helperText) && (
        <p className={cn(
          "mt-2 text-sm",
          error ? "text-red-500 dark:text-red-400" : "text-neutral-500 dark:text-neutral-400"
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export { Select, selectVariants };