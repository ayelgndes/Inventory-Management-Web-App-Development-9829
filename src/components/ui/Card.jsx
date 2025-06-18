import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

const Card = ({ children, className, ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "bg-white rounded-lg shadow-sm border border-gray-200 p-6",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export const CardHeader = ({ children, className, ...props }) => {
  return (
    <div className={cn("mb-4", className)} {...props}>
      {children}
    </div>
  )
}

export const CardTitle = ({ children, className, ...props }) => {
  return (
    <h3 className={cn("text-lg font-semibold text-gray-800", className)} {...props}>
      {children}
    </h3>
  )
}

export const CardContent = ({ children, className, ...props }) => {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  )
}

export default Card