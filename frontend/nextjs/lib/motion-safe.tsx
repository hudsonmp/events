"use client"

import React, { forwardRef, useState, useEffect } from "react"
import { HTMLMotionProps, Variants } from "framer-motion"

// Animation variants
export const buttonTapVariants: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.95 }
}

export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 }
}

export const FadeIn = forwardRef<HTMLDivElement, any>(({ children, delay = 0, className, ...props }, ref) => {
  const [MotionDiv, setMotionDiv] = useState<any>(null)

  useEffect(() => {
    // Load framer-motion dynamically
    import("framer-motion").then(({ motion }) => {
      setMotionDiv(() => motion.div)
    })
  }, [])

  // Fallback to regular div while loading
  if (!MotionDiv) {
    return (
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    )
  }

  return (
    <MotionDiv
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, delay }}
      className={className}
      {...props}
    >
      {children}
    </MotionDiv>
  )
})
FadeIn.displayName = "FadeIn"

// Safe motion div that works with Chrome DevTools
export const SafeMotionDiv = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(({ children, ...props }, ref) => {
  const [MotionDiv, setMotionDiv] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    // Load framer-motion dynamically for better performance
    import("framer-motion").then(({ motion }) => {
      setMotionDiv(() => motion.div)
    })
  }, [])

  // Server-side rendering and loading fallback
  if (!isClient || !MotionDiv) {
    // Filter out motion-specific props to avoid React warnings
    const { 
      variants, 
      initial, 
      animate, 
      exit, 
      transition, 
      whileHover, 
      whileTap, 
      whileFocus, 
      whileDrag, 
      whileInView,
      ...domProps 
    } = props

    return (
      <div ref={ref} {...domProps}>
        {children}
      </div>
    )
  }

  return (
    <MotionDiv ref={ref} {...props}>
      {children}
    </MotionDiv>
  )
})
SafeMotionDiv.displayName = "SafeMotionDiv"

// Safe AnimatePresence
export const SafeAnimatePresence = ({ children, ...props }: any) => {
  const [AnimatePresence, setAnimatePresence] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    import("framer-motion").then(({ AnimatePresence }) => {
      setAnimatePresence(() => AnimatePresence)
    })
  }, [])

  if (!isClient || !AnimatePresence) {
    return <>{children}</>
  }

  return <AnimatePresence {...props}>{children}</AnimatePresence>
}
