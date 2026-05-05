import * as React from "react"

const MOBILE_BREAKPOINT = 768

const subscribe = (callback: () => void): (() => void) => {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

const getSnapshot = (): boolean => window.innerWidth < MOBILE_BREAKPOINT

const getServerSnapshot = (): boolean => false

export function useIsMobile(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
