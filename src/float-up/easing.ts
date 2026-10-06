import type { FloatUpBezier, FloatUpMotionConfig } from './types'

export const DEFAULT_MOTION: FloatUpMotionConfig = {
  durationMs: 2800,
  easing: {
    x1: 0.22,
    y1: 1,
    x2: 0.36,
    y2: 1,
  },
}

function cubicCoordinate(t: number, point1: number, point2: number) {
  const inverse = 1 - t
  return 3 * inverse ** 2 * t * point1
    + 3 * inverse * t ** 2 * point2
    + t ** 3
}

export function evaluateCubicBezier(progress: number, easing: FloatUpBezier) {
  if (progress <= 0) return 0
  if (progress >= 1) return 1

  let lower = 0
  let upper = 1
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const parameter = (lower + upper) / 2
    const x = cubicCoordinate(parameter, easing.x1, easing.x2)
    if (x < progress) lower = parameter
    else upper = parameter
  }

  return cubicCoordinate(
    (lower + upper) / 2,
    Math.max(0, Math.min(1, easing.y1)),
    Math.max(0, Math.min(1, easing.y2)),
  )
}
