import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cva } from 'class-variance-authority';
import { cn } from '../../services/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden',
  {
    variants: {
      variant: {
        primary: 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 shadow-lg hover:shadow-xl active:shadow-md',
        secondary: 'bg-gradient-to-r from-secondary-500 to-secondary-600 text-white hover:from-secondary-600 hover:to-secondary-700 shadow-lg hover:shadow-xl active:shadow-md',
        outline: 'border-2 border-primary-500 text-primary-600 hover:bg-primary-50 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-950',
        ghost: 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800',
        glass: 'glass-morphism text-neutral-900 dark:text-white hover:bg-white/20 dark:hover:bg-white/10',
        gradient: 'bg-gradient-premium text-white shadow-lg hover:shadow-xl active:shadow-md',
        danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl active:shadow-md',
        success: 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl active:shadow-md',
      },
      size: {
        sm: 'h-8 px-3 text-sm rounded-lg',
        md: 'h-10 px-4 text-base rounded-xl',
        lg: 'h-12 px-6 text-lg rounded-xl',
        xl: 'h-14 px-8 text-xl rounded-2xl',
        icon: 'h-10 w-10 rounded-xl',
      },
      glow: {
        true: 'glow',
        false: '',
      },
      pulse: {
        true: 'animate-pulse',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      glow: false,
      pulse: false,
    },
  }
);

const Button = forwardRef(({ 
  className,
  variant,
  size,
  glow,
  pulse,
  loading = false,
  children,
  icon,
  iconPosition = 'left',
  haptic = true,
  magnetic = true,
  ripple = true,
  ...props 
}, ref) => {
  const [isPressed, setIsPressed] = React.useState(false);
  const [ripples, setRipples] = React.useState([]);
  const buttonRef = React.useRef(null);
  
  // Magnetic hover effect
  const handleMouseMove = (e) => {
    if (!magnetic || !buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    const distance = Math.sqrt(x * x + y * y);
    const maxDistance = rect.width / 2;
    
    if (distance < maxDistance * 1.5) {
      const strength = 1 - distance / (maxDistance * 1.5);
      const translateX = (x * strength) * 0.3;
      const translateY = (y * strength) * 0.3;
      
      buttonRef.current.style.transform = `translate(${translateX}px, ${translateY}px)`;
    }
  };
  
  const handleMouseLeave = () => {
    if (!magnetic || !buttonRef.current) return;
    buttonRef.current.style.transform = 'translate(0, 0)';
  };
  
  // Ripple effect
  const handleClick = (e) => {
    if (!ripple) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const rippleId = Date.now();
    setRipples(prev => [...prev, { id: rippleId, x, y }]);
    
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== rippleId));
    }, 600);
    
    // Haptic feedback simulation
    if (haptic && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };
  
  const buttonContent = (
    <>
      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.span
            key={ripple.id}
            className="absolute bg-white/30 rounded-full pointer-events-none"
            initial={{ width: 0, height: 0, opacity: 1 }}
            animate={{ width: 300, height: 300, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              left: ripple.x - 150,
              top: ripple.y - 150,
            }}
          />
        ))}
      </AnimatePresence>
      
      {/* Loading spinner */}
      {loading && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-black/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </motion.div>
      )}
      
      {/* Button content */}
      <span className={cn("relative z-10 flex items-center gap-2", loading && "opacity-0")}>
        {icon && iconPosition === 'left' && <span className="w-5 h-5">{icon}</span>}
        {children}
        {icon && iconPosition === 'right' && <span className="w-5 h-5">{icon}</span>}
      </span>
      
      {/* Hover shine effect */}
      <motion.div
        className="absolute inset-0 opacity-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
        animate={{
          x: isPressed ? 0 : [-200, 200],
          opacity: isPressed ? 0 : [0, 1, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatDelay: 1,
        }}
      />
    </>
  );
  
  return (
    <motion.button
      ref={(el) => {
        buttonRef.current = el;
        if (ref) ref.current = el;
      }}
      className={cn(buttonVariants({ variant, size, glow, pulse, className }))}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      whileTap={{ scale: haptic ? 0.97 : 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      disabled={loading || props.disabled}
      {...props}
    >
      {buttonContent}
    </motion.button>
  );
});

Button.displayName = 'Button';

// Icon Button variant
export const IconButton = forwardRef(({ className, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      size="icon"
      className={cn("rounded-full", className)}
      {...props}
    />
  );
});

IconButton.displayName = 'IconButton';

// Floating Action Button
export const FAB = forwardRef(({ className, mini = false, extended = false, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="gradient"
      size={mini ? "icon" : extended ? "lg" : "xl"}
      className={cn(
        "fixed bottom-6 right-6 rounded-full shadow-xl hover:shadow-2xl z-50",
        mini && "h-12 w-12",
        extended && "rounded-full px-6",
        className
      )}
      glow
      {...props}
    />
  );
});

FAB.displayName = 'FAB';

export { Button, buttonVariants };