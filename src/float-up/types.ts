import type { ReactNode } from 'react'

export type FloatUpPoint = {
  x: number
  y: number
}

export type FloatUpItem = {
  id: string
  src: string
  alt?: string
  target: FloatUpPoint
  width: number
  rotation: number
  spin: number
  /** Stop at target, or pass through target and leave the stage in the travel direction. */
  exitMode?: 'stop' | 'fly-out'
  /** Per-item motion. Direction is the travel angle in screen coordinates: 270° rises from below. */
  motion?: FloatUpMotionConfig & { directionDeg: number }
}

export type FloatUpReservedArea = {
  x: number
  y: number
  width: number
  height: number
}

export type FloatUpBezier = {
  x1: number
  y1: number
  x2: number
  y2: number
}

export type FloatUpMotionConfig = {
  durationMs: number
  easing: FloatUpBezier
}

export type FloatUpConfig = {
  version: 1
  reservedArea: FloatUpReservedArea
  items: FloatUpItem[]
  /** Optional for backward compatibility with early v1 configuration. */
  motion?: FloatUpMotionConfig
}

export type FloatUpController = {
  replay: () => void
}

export type FloatUpProps = {
  config: FloatUpConfig
  /** Prefix for relative item sources, such as `ornaments/star.png`. */
  assetBaseUrl?: string
  scroll?: false | {
    startOffsetPx?: number
    distanceVh?: number
  }
  className?: string
  children?: ReactNode
}

export type FloatUpVisibleBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type FloatUpImageMetadata = {
  id: string
  src: string
  alt?: string
  width: number
  height: number
  visibleBounds: FloatUpVisibleBounds
}

export type FloatUpLayoutOptions = {
  reservedArea?: FloatUpReservedArea
  stageAspectRatio?: number
}
