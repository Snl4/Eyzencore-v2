'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const LOADER_SHOW_DELAY_MS = 180

function canStartNavigation(event: MouseEvent): boolean {
  if (event.defaultPrevented) {
    return false
  }
  if (event.button !== 0) {
    return false
  }
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false
  }
  const target = event.target as HTMLElement | null
  const anchor = target?.closest('a')
  if (!anchor) {
    return false
  }
  const rawHref = anchor.getAttribute('href')
  if (!rawHref || rawHref.startsWith('#')) {
    return false
  }
  if (anchor.hasAttribute('download')) {
    return false
  }
  const targetValue = anchor.getAttribute('target')
  if (targetValue && targetValue !== '_self') {
    return false
  }
  try {
    const url = new URL(anchor.href, window.location.href)
    if (url.origin !== window.location.origin) {
      return false
    }
    if (url.pathname === window.location.pathname && url.search === window.location.search) {
      return false
    }
    return true
  } catch {
    return false
  }
}

export function RouteTransitionLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const progressTimerRef = useRef<number | null>(null)
  const doneTimerRef = useRef<number | null>(null)
  const showTimerRef = useRef<number | null>(null)
  const startedFromRouteRef = useRef<string | null>(null)

  const search = searchParams.toString()
  const routeKey = `${pathname}${search ? `?${search}` : ''}`

  const startLoading = () => {
    if (doneTimerRef.current) {
      window.clearTimeout(doneTimerRef.current)
      doneTimerRef.current = null
    }
    if (showTimerRef.current) {
      window.clearTimeout(showTimerRef.current)
      showTimerRef.current = null
    }
    setIsLoading(true)
    setProgress((current) => (current > 3 ? current : 3))
    startedFromRouteRef.current = `${window.location.pathname}${window.location.search}`
    showTimerRef.current = window.setTimeout(() => {
      setIsVisible(true)
      showTimerRef.current = null
    }, LOADER_SHOW_DELAY_MS)
    if (progressTimerRef.current) {
      return
    }
    progressTimerRef.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) {
          return current
        }
        return current + Math.max(0.6, (95 - current) * 0.085)
      })
    }, 130)
  }

  const stopLoading = () => {
    const finalize = () => {
      setProgress(100)
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
      }
      doneTimerRef.current = window.setTimeout(() => {
        setIsVisible(false)
        setIsLoading(false)
        setProgress(0)
        startedFromRouteRef.current = null
        doneTimerRef.current = null
      }, 90)
    }
    if (showTimerRef.current) {
      window.clearTimeout(showTimerRef.current)
      showTimerRef.current = null
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
      }
      setProgress(0)
      setIsLoading(false)
      startedFromRouteRef.current = null
      return
    }
    finalize()
  }

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!canStartNavigation(event)) {
        return
      }
      startLoading()
    }
    const handlePopState = () => {
      startLoading()
    }
    document.addEventListener('click', handleClick, true)
    window.addEventListener('popstate', handlePopState)
    return () => {
      document.removeEventListener('click', handleClick, true)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    if (!isLoading) {
      return
    }
    if (!startedFromRouteRef.current) {
      return
    }
    if (startedFromRouteRef.current === routeKey) {
      return
    }
    stopLoading()
  }, [routeKey, isLoading])

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current)
      }
      if (doneTimerRef.current) {
        window.clearTimeout(doneTimerRef.current)
      }
      if (showTimerRef.current) {
        window.clearTimeout(showTimerRef.current)
      }
    }
  }, [])

  return (
    <>
      <div
        className={`route-loader-top${isVisible ? ' active' : ''}`}
        style={{ transform: `scaleX(${Math.max(0, Math.min(progress, 100)) / 100})` }}
      />
      <div className={`route-loader-corner${isVisible ? ' active' : ''}`} aria-hidden="true">
        <span className="route-loader-spinner" />
      </div>
    </>
  )
}
