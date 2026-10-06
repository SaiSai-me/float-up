import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  DEFAULT_MOTION,
  evaluateCubicBezier,
  type FloatUpBezier,
  type FloatUpMotionConfig,
} from '../float-up'

type MotionCurveLabels = {
  title: string
  description: string
  canvasLabel: string
  duration: string
  seconds: string
  presets: string
  presetNames: {
    gentle: string
    linear: string
    easeOut: string
    smooth: string
  }
}

type MotionCurveEditorProps = {
  value: FloatUpMotionConfig
  labels: MotionCurveLabels
  onChange: (value: FloatUpMotionConfig) => void
}

const PRESETS = [
  { key: 'gentle', easing: DEFAULT_MOTION.easing },
  { key: 'linear', easing: { x1: 0, y1: 0, x2: 1, y2: 1 } },
  { key: 'easeOut', easing: { x1: 0.16, y1: 1, x2: 0.3, y2: 1 } },
  { key: 'smooth', easing: { x1: 0.65, y1: 0, x2: 0.35, y2: 1 } },
] as const

const Y_MIN = 0
const Y_MAX = 1
const PADDING_X = 22
const PADDING_Y = 22

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function pointMatches(left: FloatUpBezier, right: FloatUpBezier) {
  return Math.abs(left.x1 - right.x1) < 0.001
    && Math.abs(left.y1 - right.y1) < 0.001
    && Math.abs(left.x2 - right.x2) < 0.001
    && Math.abs(left.y2 - right.y2) < 0.001
}

export function MotionCurveEditor({ value, labels, onChange }: MotionCurveEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [durationDraft, setDurationDraft] = useState((value.durationMs / 1000).toFixed(1))
  const activePointRef = useRef<1 | 2 | null>(null)
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => setDurationDraft((value.durationMs / 1000).toFixed(1)), [value.durationMs])

  const commitDuration = () => {
    const seconds = Number(durationDraft)
    if (durationDraft.trim() !== '' && Number.isFinite(seconds)) {
      onChange({ ...valueRef.current, durationMs: Math.round(clamp(seconds, 0.5, 30) * 1000) })
    }
    setDurationDraft((valueRef.current.durationMs / 1000).toFixed(1))
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const draw = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const ratio = window.devicePixelRatio || 1
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      const context = canvas.getContext('2d')
      if (!context) return
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, height)

      const plotWidth = width - PADDING_X * 2
      const plotHeight = height - PADDING_Y * 2
      const mapX = (x: number) => PADDING_X + x * plotWidth
      const mapY = (y: number) => PADDING_Y + (Y_MAX - y) / (Y_MAX - Y_MIN) * plotHeight

      context.fillStyle = '#f8f7f4'
      context.fillRect(0, 0, width, height)
      context.strokeStyle = 'rgba(124, 117, 105, 0.16)'
      context.lineWidth = 1
      for (let index = 0; index <= 4; index += 1) {
        const x = PADDING_X + plotWidth * index / 4
        context.beginPath()
        context.moveTo(x, PADDING_Y)
        context.lineTo(x, height - PADDING_Y)
        context.stroke()
      }
      for (const y of [0, 0.25, 0.5, 0.75, 1]) {
        context.beginPath()
        context.moveTo(PADDING_X, mapY(y))
        context.lineTo(width - PADDING_X, mapY(y))
        context.stroke()
      }

      const start = { x: mapX(0), y: mapY(0) }
      const end = { x: mapX(1), y: mapY(1) }
      const point1 = { x: mapX(value.easing.x1), y: mapY(value.easing.y1) }
      const point2 = { x: mapX(value.easing.x2), y: mapY(value.easing.y2) }

      context.strokeStyle = 'rgba(28, 105, 255, 0.28)'
      context.lineWidth = 1.5
      context.setLineDash([5, 5])
      context.beginPath()
      context.moveTo(start.x, start.y)
      context.lineTo(point1.x, point1.y)
      context.moveTo(end.x, end.y)
      context.lineTo(point2.x, point2.y)
      context.stroke()
      context.setLineDash([])

      context.strokeStyle = '#1c69ff'
      context.lineWidth = 3
      context.lineCap = 'round'
      context.beginPath()
      for (let index = 0; index <= 100; index += 1) {
        const progress = index / 100
        const x = mapX(progress)
        const y = mapY(evaluateCubicBezier(progress, value.easing))
        if (index === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      }
      context.stroke()

      for (const [point, label] of [[point1, 'P1'], [point2, 'P2']] as const) {
        context.fillStyle = '#fff'
        context.strokeStyle = '#1c69ff'
        context.lineWidth = 3
        context.beginPath()
        context.arc(point.x, point.y, 8, 0, Math.PI * 2)
        context.fill()
        context.stroke()
        context.fillStyle = '#1c69ff'
        context.font = '700 9px Inter, sans-serif'
        context.textAlign = 'center'
        context.fillText(label, point.x, point.y - 13)
      }

      context.fillStyle = '#8b857b'
      context.font = '600 9px Inter, sans-serif'
      context.textAlign = 'left'
      context.fillText('0', PADDING_X, height - 6)
      context.textAlign = 'right'
      context.fillText('1', width - PADDING_X, height - 6)
    }

    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    draw()
    return () => observer.disconnect()
  }, [value])

  const getCurvePoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const plotWidth = bounds.width - PADDING_X * 2
    const plotHeight = bounds.height - PADDING_Y * 2
    return {
      x: clamp((event.clientX - bounds.left - PADDING_X) / plotWidth, 0, 1),
      y: clamp(Y_MAX - (event.clientY - bounds.top - PADDING_Y) / plotHeight * (Y_MAX - Y_MIN), Y_MIN, Y_MAX),
    }
  }

  const updatePoint = (point: 1 | 2, x: number, y: number) => {
    const next = { ...valueRef.current.easing }
    if (point === 1) {
      next.x1 = x
      next.y1 = y
    } else {
      next.x2 = x
      next.y2 = y
    }
    onChange({ ...valueRef.current, easing: next })
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const next = getCurvePoint(event)
    const distance1 = Math.hypot(next.x - value.easing.x1, (next.y - value.easing.y1) / 2)
    const distance2 = Math.hypot(next.x - value.easing.x2, (next.y - value.easing.y2) / 2)
    activePointRef.current = distance1 <= distance2 ? 1 : 2
    event.currentTarget.setPointerCapture(event.pointerId)
    updatePoint(activePointRef.current, next.x, next.y)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointRef.current === null) return
    const next = getCurvePoint(event)
    updatePoint(activePointRef.current, next.x, next.y)
  }

  const stopDragging = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    activePointRef.current = null
  }

  return (
    <section className="motion-editor" aria-labelledby="motion-editor-title">
      <div className="motion-editor-heading">
        <h3 id="motion-editor-title">{labels.title}</h3>
      </div>
      <p className="visually-hidden">{labels.description}</p>
      <canvas
        ref={canvasRef}
        className="motion-curve-canvas"
        width="260"
        height="190"
        role="img"
        aria-label={labels.canvasLabel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      />

      <div className="motion-parameters">
        <div className="motion-parameter">
          <div className="motion-parameter-heading">
            <span>{labels.duration}</span>
            <span className="motion-duration-value">
              <input type="number" min="0.5" max="30" step="0.1" value={durationDraft} onChange={(event) => setDurationDraft(event.target.value)} onBlur={commitDuration} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} aria-label={`${labels.duration} (${labels.seconds})`} />
              {labels.seconds}
            </span>
          </div>
          <input type="range" min="500" max="30000" step="100" value={value.durationMs} onChange={(event) => onChange({ ...value, durationMs: Number(event.target.value) })} aria-label={labels.duration} />
        </div>
      </div>

      <span className="motion-field-label">{labels.presets}</span>
      <div className="motion-presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            className={pointMatches(value.easing, preset.easing) ? 'is-active' : ''}
            onClick={() => onChange({ ...value, easing: { ...preset.easing } })}
          >
            {labels.presetNames[preset.key]}
          </button>
        ))}
      </div>
    </section>
  )
}
