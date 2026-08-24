import type {
  FloatUpConfig,
  FloatUpImageMetadata,
  FloatUpItem,
  FloatUpLayoutOptions,
  FloatUpReservedArea,
} from './types'

export const DEFAULT_RESERVED_AREA: FloatUpReservedArea = {
  x: 0.27,
  y: 0.25,
  width: 0.46,
  height: 0.5,
}

const ANCHORS = [
  { x: 0.1, y: 0.17 },
  { x: 0.28, y: 0.11 },
  { x: 0.5, y: 0.09 },
  { x: 0.72, y: 0.11 },
  { x: 0.9, y: 0.17 },
  { x: 0.08, y: 0.35 },
  { x: 0.92, y: 0.36 },
  { x: 0.07, y: 0.57 },
  { x: 0.93, y: 0.58 },
  { x: 0.11, y: 0.79 },
  { x: 0.89, y: 0.8 },
  { x: 0.23, y: 0.89 },
  { x: 0.77, y: 0.89 },
  { x: 0.04, y: 0.69 },
  { x: 0.96, y: 0.69 },
  { x: 0.16, y: 0.48 },
  { x: 0.84, y: 0.48 },
  { x: 0.38, y: 0.08 },
  { x: 0.62, y: 0.08 },
  { x: 0.5, y: 0.92 },
] as const

const ROTATIONS = [-8, 7, -4, 10, -6, 5, -11, 8, -3, 12, -7, 4]
const SPINS = [14, -12, 10, -15, 12, -9, 16, -13, 11, -14]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getItemHeight(item: FloatUpItem, metadata: FloatUpImageMetadata, stageAspectRatio: number) {
  return item.width * (metadata.height / metadata.width) * stageAspectRatio
}

function intersects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  gap = 0,
) {
  return Math.abs(a.x - b.x) < (a.width + b.width) / 2 + gap
    && Math.abs(a.y - b.y) < (a.height + b.height) / 2 + gap
}

function keepOutsideReservedArea(
  item: FloatUpItem,
  height: number,
  reserved: FloatUpReservedArea,
) {
  const itemBox = { x: item.target.x, y: item.target.y, width: item.width, height }
  const reservedBox = {
    x: reserved.x + reserved.width / 2,
    y: reserved.y + reserved.height / 2,
    width: reserved.width,
    height: reserved.height,
  }

  if (!intersects(itemBox, reservedBox, 0.025)) return item

  const leftEdge = reserved.x - item.width / 2 - 0.035
  const rightEdge = reserved.x + reserved.width + item.width / 2 + 0.035
  const topEdge = reserved.y - height / 2 - 0.035
  const distances = [
    { distance: Math.abs(item.target.x - leftEdge), x: leftEdge, y: item.target.y },
    { distance: Math.abs(item.target.x - rightEdge), x: rightEdge, y: item.target.y },
    { distance: Math.abs(item.target.y - topEdge), x: item.target.x, y: topEdge },
  ].sort((a, b) => a.distance - b.distance)

  item.target = {
    x: clamp(distances[0].x, item.width / 2 + 0.025, 1 - item.width / 2 - 0.025),
    y: clamp(distances[0].y, height / 2 + 0.025, 1 - height / 2 - 0.025),
  }
  return item
}

function resolveCollisions(
  items: FloatUpItem[],
  metadata: FloatUpImageMetadata[],
  reserved: FloatUpReservedArea,
  stageAspectRatio: number,
) {
  const resolved: FloatUpItem[] = []

  items.forEach((sourceItem, index) => {
    const item = { ...sourceItem, target: { ...sourceItem.target } }
    const height = getItemHeight(item, metadata[index], stageAspectRatio)
    keepOutsideReservedArea(item, height, reserved)

    for (let pass = 0; pass < 10; pass += 1) {
      const itemBox = { x: item.target.x, y: item.target.y, width: item.width, height }
      const collision = resolved.find((previous, previousIndex) => {
        const previousHeight = getItemHeight(previous, metadata[previousIndex], stageAspectRatio)
        return intersects(itemBox, {
          x: previous.target.x,
          y: previous.target.y,
          width: previous.width,
          height: previousHeight,
        }, 0.018)
      })

      if (!collision) break

      const direction = index % 2 === 0 ? 1 : -1
      const nextY = clamp(item.target.y + direction * (height * 0.45 + 0.025), height / 2 + 0.025, 1 - height / 2 - 0.025)
      const nextX = clamp(item.target.x + (item.target.x < 0.5 ? -0.025 : 0.025), item.width / 2 + 0.025, 1 - item.width / 2 - 0.025)
      item.target = { x: nextX, y: nextY }
      keepOutsideReservedArea(item, height, reserved)
    }

    resolved.push(item)
  })

  return resolved
}

export function createFloatUpLayout(
  metadata: FloatUpImageMetadata[],
  options: FloatUpLayoutOptions = {},
): FloatUpConfig {
  const reservedArea = options.reservedArea ?? DEFAULT_RESERVED_AREA
  const stageAspectRatio = options.stageAspectRatio ?? 16 / 9
  const densityScale = metadata.length > ANCHORS.length
    ? Math.max(0.68, Math.sqrt(ANCHORS.length / metadata.length))
    : 1

  const items = metadata.map<FloatUpItem>((image, index) => {
    const visibleWidthRatio = Math.max(0.08, image.visibleBounds.width / image.width)
    const visibleHeightRatio = Math.max(0.08, image.visibleBounds.height / image.height)
    const visibleAspect = (image.width * visibleWidthRatio) / (image.height * visibleHeightRatio)
    const visibleWidth = clamp(Math.sqrt(0.014 * visibleAspect / stageAspectRatio), 0.065, 0.14)
    const width = clamp((visibleWidth / visibleWidthRatio) * densityScale, 0.06, 0.2)
    const anchor = ANCHORS[index % ANCHORS.length]
    const lap = Math.floor(index / ANCHORS.length)

    return {
      id: image.id,
      src: image.src,
      alt: image.alt,
      target: {
        x: clamp(anchor.x + (lap % 2 === 0 ? 0.018 : -0.018) * lap, 0.04, 0.96),
        y: clamp(anchor.y + 0.03 * lap, 0.05, 0.95),
      },
      width,
      rotation: ROTATIONS[index % ROTATIONS.length],
      spin: SPINS[index % SPINS.length],
    }
  })

  return {
    version: 1,
    reservedArea: { ...reservedArea },
    items: resolveCollisions(items, metadata, reservedArea, stageAspectRatio),
  }
}
