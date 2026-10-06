import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import type { CSSProperties } from 'react'
import type { FloatUpController, FloatUpProps } from './types'
import { DEFAULT_MOTION, evaluateCubicBezier } from './easing'
import { getEntryOffset } from './entry'
import './float-up.css'

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

export const FloatUp = forwardRef<FloatUpController, FloatUpProps>(function FloatUp(
  { config, scroll, assetBaseUrl = '', className = '', children },
  forwardedRef,
) {
  const stageRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | undefined>(undefined)
  const replayStartedAtRef = useRef<number | undefined>(undefined)
  const replayHoldingRef = useRef(false)
  const reduceMotionRef = useRef(false)

  const update = () => {
    const stage = stageRef.current
    if (!stage) return

    const now = window.performance.now()
    const defaultMotion = config.motion ?? DEFAULT_MOTION
    const elapsed = replayStartedAtRef.current === undefined ? null : now - replayStartedAtRef.current
    const maxDuration = config.items.length > 0
      ? Math.max(...config.items.map((item) => item.motion?.durationMs ?? defaultMotion.durationMs))
      : defaultMotion.durationMs
    let scrollProgress = 1

    if (reduceMotionRef.current) {
      replayStartedAtRef.current = undefined
      replayHoldingRef.current = false
    } else if (elapsed === null && !replayHoldingRef.current && scroll !== false) {
      const start = scroll?.startOffsetPx ?? 0
      const distance = window.innerHeight * (scroll?.distanceVh ?? 1.15)
      scrollProgress = clamp01((window.scrollY - start) / Math.max(1, distance))
    }

    const stageWidth = stage.clientWidth
    const stageHeight = stage.clientHeight
    const elements = stage.querySelectorAll<HTMLElement>('[data-float-up-item]')

    elements.forEach((element, index) => {
      const item = config.items[index]
      if (!item) return
      const motion = item.motion ?? defaultMotion
      const sourceProgress = reduceMotionRef.current || replayHoldingRef.current
        ? 1
        : elapsed === null
          ? clamp01(scrollProgress * maxDuration / Math.max(1, motion.durationMs))
          : clamp01(elapsed / Math.max(1, motion.durationMs))
      const progress = evaluateCubicBezier(sourceProgress, motion.easing)
      const targetX = item.target.x * stageWidth
      const targetY = item.target.y * stageHeight
      const margin = Math.max(element.clientWidth, element.clientHeight) / 2 + 56
      const directionDeg = item.motion?.directionDeg ?? 270
      const entry = getEntryOffset(targetX, targetY, stageWidth, stageHeight, margin, directionDeg)
      const exit = item.exitMode === 'fly-out' && !reduceMotionRef.current
        ? getEntryOffset(targetX, targetY, stageWidth, stageHeight, margin, directionDeg + 180)
        : { x: 0, y: 0 }
      const offsetX = entry.x * (1 - progress) + exit.x * progress
      const offsetY = entry.y * (1 - progress) + exit.y * progress
      element.style.transform = `translate3d(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px), 0) rotate(${item.rotation}deg)`
    })

    if (elapsed !== null && elapsed >= maxDuration) {
      replayStartedAtRef.current = undefined
      replayHoldingRef.current = true
    }

    if (replayStartedAtRef.current !== undefined) {
      frameRef.current = window.requestAnimationFrame(update)
    } else {
      frameRef.current = undefined
    }
  }

  const requestUpdate = () => {
    if (frameRef.current === undefined) {
      frameRef.current = window.requestAnimationFrame(update)
    }
  }

  useImperativeHandle(forwardedRef, () => ({
    replay() {
      if (reduceMotionRef.current) {
        replayStartedAtRef.current = undefined
        replayHoldingRef.current = false
        requestUpdate()
        return
      }

      replayHoldingRef.current = false
      replayStartedAtRef.current = window.performance.now()
      requestUpdate()
    },
  }))

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduceMotionRef.current = media.matches

    const onScroll = () => {
      if (scroll === false) return
      if (replayStartedAtRef.current !== undefined || replayHoldingRef.current) {
        replayStartedAtRef.current = undefined
        replayHoldingRef.current = false
      }
      requestUpdate()
    }
    const onMotionChange = () => {
      reduceMotionRef.current = media.matches
      requestUpdate()
    }
    const observer = new ResizeObserver(requestUpdate)

    observer.observe(stage)
    window.addEventListener('scroll', onScroll, { passive: true })
    media.addEventListener('change', onMotionChange)
    requestUpdate()

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      media.removeEventListener('change', onMotionChange)
      if (frameRef.current !== undefined) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = undefined
      }
    }
  }, [config, scroll])

  return (
    <div ref={stageRef} className={`float-up-stage ${className}`.trim()}>
      <div className="float-up-items">
        {config.items.map((item) => (
          <img
            key={item.id}
            className="float-up-item"
            src={assetBaseUrl && !/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(item.src)
              ? `${assetBaseUrl.replace(/\/?$/, '/')}${item.src.replace(/^\.\//, '')}`
              : item.src}
            alt={item.alt ?? ''}
            aria-hidden={item.alt ? undefined : true}
            draggable={false}
            data-float-up-item
            data-target-y={item.target.y}
            data-rotation={item.rotation}
            data-spin={item.spin}
            style={{
              left: `${item.target.x * 100}%`,
              top: `${item.target.y * 100}%`,
              width: `${item.width * 100}%`,
            } as CSSProperties}
          />
        ))}
      </div>
      {children != null && <div
        className="float-up-reserved"
        style={{
          left: `${config.reservedArea.x * 100}%`,
          top: `${config.reservedArea.y * 100}%`,
          width: `${config.reservedArea.width * 100}%`,
          height: `${config.reservedArea.height * 100}%`,
        }}
      >
        {children}
      </div>}
    </div>
  )
})
