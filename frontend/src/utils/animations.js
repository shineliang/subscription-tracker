// Premium animation presets with spring physics
export const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

export const smoothSpring = {
  type: "spring",
  stiffness: 200,
  damping: 25,
};

export const bounceSpring = {
  type: "spring",
  stiffness: 600,
  damping: 15,
};

export const stiffSpring = {
  type: "spring",
  stiffness: 800,
  damping: 35,
};

// Stagger children animations
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

export const staggerItem = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springTransition,
  },
};

// Page transitions
export const pageTransition = {
  initial: { 
    opacity: 0, 
    x: -20,
    scale: 0.98,
  },
  animate: { 
    opacity: 1, 
    x: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.23, 1, 0.32, 1],
    },
  },
  exit: { 
    opacity: 0, 
    x: 20,
    scale: 0.98,
    transition: {
      duration: 0.3,
      ease: [0.23, 1, 0.32, 1],
    },
  },
};

// Modal animations
export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

export const modalContent = {
  initial: { 
    opacity: 0, 
    scale: 0.9,
    y: 20,
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: springTransition,
  },
  exit: { 
    opacity: 0, 
    scale: 0.9,
    y: 20,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

// Floating animation
export const floatingAnimation = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Glow pulse animation
export const glowPulse = {
  animate: {
    boxShadow: [
      "0 0 20px rgba(139, 92, 246, 0.3)",
      "0 0 40px rgba(139, 92, 246, 0.5)",
      "0 0 20px rgba(139, 92, 246, 0.3)",
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Magnetic hover effect
export const magneticHover = {
  rest: {
    x: 0,
    y: 0,
    transition: smoothSpring,
  },
  hover: {
    x: 0,
    y: 0,
    transition: smoothSpring,
  },
};

// 3D card flip
export const card3D = {
  initial: {
    rotateY: 0,
    transformPerspective: 1000,
  },
  flip: {
    rotateY: 180,
    transformPerspective: 1000,
    transition: springTransition,
  },
};

// Parallax scroll effect
export const parallaxY = (offset = 50) => ({
  initial: { y: -offset },
  animate: { 
    y: offset,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
});

// Text reveal animation
export const textReveal = {
  hidden: {
    opacity: 0,
    y: 20,
    clipPath: "inset(100% 0% 0% 0%)",
  },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    clipPath: "inset(0% 0% 0% 0%)",
    transition: {
      delay: i * 0.05,
      duration: 0.8,
      ease: [0.215, 0.61, 0.355, 1],
    },
  }),
};

// Gradient shift animation
export const gradientShift = {
  animate: {
    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
    transition: {
      duration: 5,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

// Shake animation for errors
export const shake = {
  animate: {
    x: [-10, 10, -10, 10, 0],
    transition: {
      duration: 0.5,
      ease: "easeInOut",
    },
  },
};

// Custom cursor animations
export const customCursor = {
  default: { scale: 1 },
  hover: { 
    scale: 1.5,
    transition: springTransition,
  },
  click: { 
    scale: 0.8,
    transition: stiffSpring,
  },
};

// Ambient particle animation
export const particle = {
  initial: {
    opacity: 0,
    scale: 0,
  },
  animate: {
    opacity: [0, 1, 0],
    scale: [0, 1, 0],
    y: [-20, -100],
    x: [0, (Math.random() - 0.5) * 100],
    transition: {
      duration: 3,
      repeat: Infinity,
      delay: Math.random() * 2,
      ease: "easeOut",
    },
  },
};

// Morphing shape animation
export const morphShape = {
  animate: {
    borderRadius: ["20% 80% 70% 30%", "80% 20% 30% 70%", "20% 80% 70% 30%"],
    rotate: [0, 180, 360],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

// Elastic pop animation
export const elasticPop = {
  initial: { scale: 0 },
  animate: { 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 1000,
      damping: 15,
      mass: 0.5,
    },
  },
  exit: { 
    scale: 0,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};