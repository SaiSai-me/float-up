import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import type { CSSProperties } from 'react'
import type { FloatUpController, FloatUpProps } from './types'
import { DEFAULT_MOTION, evaluateCubicBezier } from './easing'
import './float-up.css'

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

export const FloatUp = forwardRef<FloatUpController, FloatUpProps>(function FloatUp(
  { config, scroll, className = '', children },
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
    const motion = config.motion ?? DEFAULT_MOTION
    let sourceProgress = 1

    if (reduceMotionRef.current) {
      sourceProgress = 1
      replayStartedAtRef.current = undefined
      replayHoldingRef.current = false
    } else if (replayStartedAtRef.current !== undefined) {
      sourceProgress = clamp01((now - replayStartedAtRef.current) / Math.max(1, motion.durationMs))
      if (sourceProgress >= 1) {
        replayStartedAtRef.current = undefined
        replayHoldingRef.current = true
      }
    } else if (replayHoldingRef.current) {
      sourceProgress = 1
    } else if (scroll !== false) {
      const start = scroll?.startOffsetPx ?? 0
      const distance = window.innerHeight * (scroll?.distanceVh ?? 1.15)
      sourceProgress = clamp01((window.scrollY - start) / Math.max(1, distance))
    }

    const progress = evaluateCubicBezier(sourceProgress, motion.easing)
    const stageHeight = stage.clientHeight
    const elements = stage.querySelectorAll<HTMLElement>('[data-float-up-item]')

    elements.forEach((element) => {
      const targetY = Number(element.dataset.targetY ?? 0.5) * stageHeight
      const spin = Number(element.dataset.spin ?? 0)
      const rotation = Number(element.dataset.rotation ?? 0)
      const originY = stageHeight + 56
      const rise = (originY - targetY) * (1 - progress)
      const impactRotation = Math.sin(sourceProgress * Math.PI) * spin
      element.style.transform = `translate3d(-50%, calc(-50% + ${rise}px), 0) rotate(${rotation + impactRotation}deg)`
    })

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
      if (frameRef.current !== undefined) window.cancelAnimationFrame(frameRef.current)
    }
  }, [config, scroll])

  return (
    <div ref={stageRef} className={`float-up-stage ${className}`.trim()}>
      <div className="float-up-items">
        {config.items.map((item) => (
          <img
            key={item.id}
            className="float-up-item"
            src={item.src}
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
      <div
        className="float-up-reserved"
        style={{
          left: `${config.reservedArea.x * 100}%`,
          top: `${config.reservedArea.y * 100}%`,
          width: `${config.reservedArea.width * 100}%`,
          height: `${config.reservedArea.height * 100}%`,
        }}
      >
        {children}
      </div>
    </div>
  )
})
