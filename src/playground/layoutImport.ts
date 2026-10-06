import type { FloatUpBezier, FloatUpConfig } from '../float-up'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isUnitNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1
}

function normalizeEasing(easing: FloatUpBezier): FloatUpBezier {
  return {
    x1: easing.x1,
    y1: Math.min(1, Math.max(0, easing.y1)),
    x2: easing.x2,
    y2: Math.min(1, Math.max(0, easing.y2)),
  }
}

export function getLayoutFileName(src: string) {
  return /^\/?ornaments\/([a-z0-9][a-z0-9-]*\.(?:png|webp))$/.exec(src)?.[1] ?? null
}

export function parseFloatUpConfig(value: unknown): FloatUpConfig | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.reservedArea) || !Array.isArray(value.items)) {
    return null
  }

  const area = value.reservedArea
  if (!isUnitNumber(area.x) || !isUnitNumber(area.y)
    || !isFiniteNumber(area.width) || area.width < 0
    || !isFiniteNumber(area.height) || area.height < 0
    || area.x + area.width > 1 || area.y + area.height > 1
    || value.items.length > 200) {
    return null
  }

  const ids = new Set<string>()
  const sources = new Set<string>()
  for (const item of value.items) {
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id || ids.has(item.id)
      || typeof item.src !== 'string' || !getLayoutFileName(item.src) || sources.has(getLayoutFileName(item.src)!)
      || !isRecord(item.target) || !isUnitNumber(item.target.x) || !isUnitNumber(item.target.y)
      || !isFiniteNumber(item.width) || item.width <= 0 || item.width > 1
      || !isFiniteNumber(item.rotation) || !isFiniteNumber(item.spin)
      || (item.alt !== undefined && typeof item.alt !== 'string')
      || (item.exitMode !== undefined && item.exitMode !== 'stop' && item.exitMode !== 'fly-out')) {
      return null
    }
    if (item.motion !== undefined) {
      const motion = item.motion
      if (!isRecord(motion) || !isFiniteNumber(motion.durationMs) || motion.durationMs <= 0
        || !isFiniteNumber(motion.directionDeg) || motion.directionDeg < 0 || motion.directionDeg > 360
        || !isRecord(motion.easing)
        || !isUnitNumber(motion.easing.x1) || !isUnitNumber(motion.easing.x2)
        || !isFiniteNumber(motion.easing.y1) || !isFiniteNumber(motion.easing.y2)) {
        return null
      }
    }
    ids.add(item.id)
    sources.add(getLayoutFileName(item.src)!)
  }

  if (value.motion !== undefined) {
    const motion = value.motion
    if (!isRecord(motion) || !isFiniteNumber(motion.durationMs) || motion.durationMs <= 0
      || !isRecord(motion.easing)
      || !isUnitNumber(motion.easing.x1) || !isUnitNumber(motion.easing.x2)
      || !isFiniteNumber(motion.easing.y1) || !isFiniteNumber(motion.easing.y2)) {
      return null
    }
  }

  const config = value as FloatUpConfig
  return {
    version: 1,
    reservedArea: { ...config.reservedArea },
    items: config.items.map((item) => ({
      id: item.id,
      src: item.src,
      ...(item.alt !== undefined ? { alt: item.alt } : {}),
      target: { ...item.target },
      width: item.width,
      rotation: item.rotation,
      spin: 0,
      ...(item.exitMode !== undefined ? { exitMode: item.exitMode } : {}),
      ...(item.motion ? { motion: {
        durationMs: item.motion.durationMs,
        directionDeg: item.motion.directionDeg,
        easing: normalizeEasing(item.motion.easing),
      } } : {}),
    })),
    ...(config.motion ? { motion: {
      durationMs: config.motion.durationMs,
      easing: normalizeEasing(config.motion.easing),
    } } : {}),
  }
}
