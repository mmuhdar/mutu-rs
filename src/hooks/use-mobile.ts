import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

/** Benar di layar < 768 px (sidebar menjadi Sheet). Berlangganan media query tanpa setState di dalam effect. */
export function useIsMobile() {
  return React.useSyncExternalStore(
    (ubah) => {
      const mql = window.matchMedia(QUERY)
      mql.addEventListener("change", ubah)
      return () => mql.removeEventListener("change", ubah)
    },
    () => window.matchMedia(QUERY).matches,
    () => false
  )
}
