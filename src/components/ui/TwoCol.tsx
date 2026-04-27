import type { ReactNode } from 'react'

interface TwoColProps {
  children: ReactNode
  className?: string
}

/** Grid that stacks on mobile, 2-col on md+ */
export default function TwoCol({ children, className = '' }: TwoColProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 ${className}`}>
      {children}
    </div>
  )
}
