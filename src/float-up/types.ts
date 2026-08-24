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
}

export type FloatUpReservedArea = {
  x: number
  y: number
  width: number
  height: number
}

export type FloatUpConfig = {
  version: 1
  reservedArea: FloatUpReservedArea
  items: FloatUpItem[]
}

export type FloatUpController = {
  replay: () => void
}

export type FloatUpProps = {
  config: FloatUpConfig
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
