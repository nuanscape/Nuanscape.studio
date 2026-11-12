import * as React from 'react'

const DEFAULT_POSTER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='9'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23070d12'/%3E%3Cstop offset='1' stop-color='%2310232a'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='16' height='9' fill='url(%23g)'/%3E%3C/svg%3E"

export function BackgroundVideo({
  src,
  poster = DEFAULT_POSTER,
  className,
}: {
  src: string
  poster?: string
  className?: string
}) {
  const ref = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    el.muted = true
    el.defaultMuted = true

    const tryPlay = () => {
      const result = el.play()
      if (result && typeof result.catch === 'function') result.catch(() => {})
    }

    tryPlay()
    el.addEventListener('loadeddata', tryPlay)
    el.addEventListener('canplay', tryPlay)
    el.addEventListener('loadedmetadata', tryPlay)

    const onInteraction = () => {
      tryPlay()
      cleanup()
    }
    const cleanup = () => {
      window.removeEventListener('pointerdown', onInteraction)
      window.removeEventListener('touchstart', onInteraction)
      window.removeEventListener('keydown', onInteraction)
    }
    window.addEventListener('pointerdown', onInteraction, { passive: true })
    window.addEventListener('touchstart', onInteraction, { passive: true })
    window.addEventListener('keydown', onInteraction)

    const onVisibility = () => {
      if (!document.hidden) tryPlay()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      el.removeEventListener('loadeddata', tryPlay)
      el.removeEventListener('canplay', tryPlay)
      el.removeEventListener('loadedmetadata', tryPlay)
      document.removeEventListener('visibilitychange', onVisibility)
      cleanup()
    }
  }, [])

  return (
    <video
      ref={ref}
      autoPlay
      loop
      muted
      playsInline
      disablePictureInPicture
      aria-hidden="true"
      preload="auto"
      poster={poster}
      className={className}
    >
      <source src={src} type="video/mp4" />
    </video>
  )
}
