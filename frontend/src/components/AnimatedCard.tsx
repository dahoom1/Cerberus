import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  delay?: number
  hover?: boolean
  glass?: boolean
}

const AnimatedCard = ({
  children,
  className = '',
  delay = 0,
  hover = true,
  glass = false
}: AnimatedCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={hover ? { y: -5, boxShadow: '0 20px 40px rgba(147, 51, 234, 0.3)' } : {}}
      className={`${glass ? 'glass dark:glass-dark' : 'bg-card border'} rounded-lg p-6 ${className}`}
    >
      {children}
    </motion.div>
  )
}

export default AnimatedCard
