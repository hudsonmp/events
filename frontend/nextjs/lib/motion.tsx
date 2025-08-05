"use client"

import { motion, HTMLMotionProps, Variants } from "framer-motion"
import { forwardRef } from "react"

// Animation variants
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
}

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 }
}

export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 }
}

export const slideInFromRightVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 }
}

export const slideInFromLeftVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
}

export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: 20
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 400,
      duration: 0.3
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 20,
    transition: {
      duration: 0.2
    }
  }
}

export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      duration: 0.2
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
}

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
}

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 300
    }
  }
}

export const cardHoverVariants: Variants = {
  rest: { scale: 1, y: 0 },
  hover: { 
    scale: 1.02, 
    y: -4,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 300
    }
  }
}

export const buttonTapVariants: Variants = {
  rest: { scale: 1 },
  tap: { scale: 0.95 }
}

// Reusable motion components
export const MotionDiv = motion.div
export const MotionButton = motion.button
export const MotionSpan = motion.span
export const MotionUl = motion.ul
export const MotionLi = motion.li

// Enhanced motion components with common props
interface FadeInProps extends HTMLMotionProps<"div"> {
  delay?: number
  duration?: number
}

export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(
  ({ children, delay = 0, duration = 0.3, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration, delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
)
FadeIn.displayName = "FadeIn"

interface SlideUpProps extends HTMLMotionProps<"div"> {
  delay?: number
  duration?: number
}

export const SlideUp = forwardRef<HTMLDivElement, SlideUpProps>(
  ({ children, delay = 0, duration = 0.3, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ 
        type: "spring",
        damping: 20,
        stiffness: 300,
        delay
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
)
SlideUp.displayName = "SlideUp"

interface ScaleInProps extends HTMLMotionProps<"div"> {
  delay?: number
}

export const ScaleIn = forwardRef<HTMLDivElement, ScaleInProps>(
  ({ children, delay = 0, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        type: "spring",
        damping: 25,
        stiffness: 400,
        delay
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
)
ScaleIn.displayName = "ScaleIn"

// Stagger container for lists
interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  staggerDelay?: number
}

export const StaggerContainer = forwardRef<HTMLDivElement, StaggerContainerProps>(
  ({ children, staggerDelay = 0.1, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      {...props}
    >
      {children}
    </motion.div>
  )
)
StaggerContainer.displayName = "StaggerContainer"

interface StaggerItemProps extends HTMLMotionProps<"div"> {}

export const StaggerItem = forwardRef<HTMLDivElement, StaggerItemProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={staggerItemVariants}
      {...props}
    >
      {children}
    </motion.div>
  )
)
StaggerItem.displayName = "StaggerItem" 