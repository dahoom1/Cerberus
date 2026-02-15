import { ReactNode } from 'react'

interface GlowingBorderProps {
  children: ReactNode
  color?: 'purple' | 'blue' | 'cyan' | 'green' | 'red'
  className?: string
}

const GlowingBorder = ({
  children,
  color = 'purple',
  className = ''
}: GlowingBorderProps) => {
  const colorMap = {
    purple: 'from-cyber-purple to-cyber-blue shadow-glow-md',
    blue: 'from-neon-blue to-cyber-cyan shadow-glow-cyan',
    cyan: 'from-cyber-cyan to-cyber-blue shadow-glow-cyan',
    green: 'from-cyber-green to-cyber-cyan shadow-glow-green',
    red: 'from-red-500 to-cyber-pink shadow-glow-red',
  }

  return (
    <div className={`relative ${className}`}>
      <div className={`absolute inset-0 bg-gradient-to-r ${colorMap[color]} rounded-lg blur-sm opacity-75`} />
      <div className="relative bg-card rounded-lg border border-white/10">
        {children}
      </div>
    </div>
  )
}

export default GlowingBorder
