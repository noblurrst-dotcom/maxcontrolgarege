import { useState, useEffect } from 'react'

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

const BREAKPOINTS: [Breakpoint, number][] = [
  ['2xl', 1536],
  ['xl', 1280],
  ['lg', 1024],
  ['md', 768],
  ['sm', 640],
  ['xs', 0],
]

function getBreakpoint(w: number): Breakpoint {
  for (const [bp, min] of BREAKPOINTS) {
    if (w >= min) return bp
  }
  return 'xs'
}

export function useBreakpoint() {
  const [bp, setBp] = useState<Breakpoint>(() => getBreakpoint(window.innerWidth))
  const [width, setWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth
      setWidth(w)
      setBp(getBreakpoint(w))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return {
    breakpoint: bp,
    width,
    isMobile: bp === 'xs' || bp === 'sm',
    isTablet: bp === 'md',
    isDesktop: bp === 'lg' || bp === 'xl' || bp === '2xl',
    below: (target: Breakpoint) => {
      const targetMin = BREAKPOINTS.find(([b]) => b === target)?.[1] ?? 0
      return width < targetMin
    },
  }
}
