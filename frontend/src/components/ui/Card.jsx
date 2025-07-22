import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ 
  children, 
  className = '', 
  variant = 'glass', // glass, solid, neumorphic, gradient
  hover = true,
  glow = false,
  gradient = false,
  elevation = 'medium', // low, medium, high
  padding = 'md',
  onClick,
  ...props 
}) => {
  const baseClasses = 'relative overflow-hidden rounded-2xl transition-all duration-500';
  
  const variants = {
    glass: 'glass-morphism',
    solid: 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800',
    neumorphic: 'neumorphic',
    gradient: 'bg-gradient-premium text-white',
  };
  
  const elevations = {
    low: 'shadow-glass-sm',
    medium: 'shadow-glass',
    high: 'shadow-glass-lg',
  };
  
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  };
  
  const hoverClasses = hover ? 'hover:scale-[1.02] hover:-translate-y-1 hover:shadow-premium-lg' : '';
  const glowClasses = glow ? 'glow' : '';
  const gradientBorder = gradient ? 'gradient-border' : '';
  
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95,
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.23, 1, 0.32, 1],
      }
    },
    hover: {
      y: -5,
      transition: {
        duration: 0.3,
        ease: [0.23, 1, 0.32, 1],
      }
    },
    tap: {
      scale: 0.98,
      transition: {
        duration: 0.1,
        ease: [0.23, 1, 0.32, 1],
      }
    }
  };
  
  return (
    <motion.div
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${variant !== 'gradient' ? elevations[elevation] : ''}
        ${paddings[padding]}
        ${hoverClasses}
        ${glowClasses}
        ${gradientBorder}
        ${className}
      `}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={hover ? "hover" : undefined}
      whileTap={onClick ? "tap" : undefined}
      onClick={onClick}
      {...props}
    >
      {/* Mesh gradient overlay for depth */}
      {variant === 'glass' && (
        <div className="absolute inset-0 bg-gradient-mesh opacity-50 pointer-events-none" />
      )}
      
      {/* Animated gradient border */}
      {gradient && (
        <div className="absolute inset-0 rounded-2xl p-[2px] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 animate-spin-slow" />
        </div>
      )}
      
      {/* Content wrapper */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Hover glow effect */}
      {glow && (
        <motion.div
          className="absolute inset-0 opacity-0 pointer-events-none"
          animate={{
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="absolute inset-0 bg-gradient-premium blur-3xl" />
        </motion.div>
      )}
    </motion.div>
  );
};

// Specialized card variants
export const GlassCard = (props) => <Card {...props} variant="glass" />;
export const SolidCard = (props) => <Card {...props} variant="solid" />;
export const NeumorphicCard = (props) => <Card {...props} variant="neumorphic" />;
export const GradientCard = (props) => <Card {...props} variant="gradient" />;

// Card sections
export const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`mb-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '', ...props }) => (
  <h3 className={`text-2xl font-display font-semibold text-neutral-900 dark:text-neutral-100 ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '', ...props }) => (
  <p className={`mt-2 text-neutral-600 dark:text-neutral-400 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent = ({ children, className = '', ...props }) => (
  <div className={`${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800 ${className}`} {...props}>
    {children}
  </div>
);

export default Card;