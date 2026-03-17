import React from 'react'

interface ResponsiveCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export default function ResponsiveCard({ children, className = '', onClick }: ResponsiveCardProps) {
  return (
    <div 
      className={`card-responsive hover-mobile-safe ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface ResponsiveGridProps {
  children: React.ReactNode
  cols?: 1 | 2 | 3 | 4
  className?: string
}

export function ResponsiveGrid({ children, cols = 1, className = '' }: ResponsiveGridProps) {
  const gridCols = {
    1: 'mobile-grid-1 sm:grid-cols-1',
    2: 'mobile-grid-2 sm:grid-cols-2',
    3: 'mobile-grid-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'mobile-grid-2 sm:grid-cols-2 lg:grid-cols-4'
  }

  return (
    <div className={`grid ${gridCols[cols]} gap-3 sm:gap-4 ${className}`}>
      {children}
    </div>
  )
}

interface ResponsiveButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
}

export function ResponsiveButton({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  className = ''
}: ResponsiveButtonProps) {
  const baseClasses = 'btn-mobile rounded-xl font-medium transition-all duration-200'
  
  const variantClasses = {
    primary: 'text-white shadow-lg',
    secondary: 'bg-gray-100 text-gray-700 border border-gray-200',
    danger: 'bg-red-500 text-white shadow-lg'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg'
  }

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : ''

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
