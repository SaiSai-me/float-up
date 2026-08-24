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

function cubicDerivative(t: number, point1: number, point2: number) {
  const inverse = 1 - t
  return 3 * inverse ** 2 * point1
    + 6 * inverse * t * (point2 - point1)
    + 3 * t ** 2 * (1 - point2)
}

export function evaluateCubicBezier(progress: number, easing: FloatUpBezier) {
  if (progress <= 0) return 0
  if (progress >= 1) return 1

  let parameter = progress
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const x = cubicCoordinate(parameter, easing.x1, easing.x2) - progress
    const derivative = cubicDerivative(parameter, easing.x1, easing.x2)
    if (Math.abs(x) < 0.000001) break
    if (Math.abs(derivative) < 0.000001) break
    parameter = Math.min(1, Math.max(0, parameter - x / derivative))
  }

  let lower = 0
  let upper = 1
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const x = cubicCoordinate(parameter, easing.x1, easing.x2)
    if (Math.abs(x - progress) < 0.000001) break
    if (x < progress) lower = parameter
    else upper = parameter
    parameter = (lower + upper) / 2
  }

  return cubicCoordinate(parameter, easing.y1, easing.y2)
}
