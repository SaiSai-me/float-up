import type { FloatUpImageMetadata, FloatUpVisibleBounds } from '../float-up'

export type PlaygroundAsset = {
  metadata: FloatUpImageMetadata
  exportSrc: string
  objectUrl?: string
  fileName: string
}

export type ImageFileErrorCode = 'unsupported' | 'decode' | 'inspect' | 'opaque' | 'empty' | 'missing' | 'unknown'

export class ImageFileError extends Error {
  readonly code: ImageFileErrorCode
  readonly fileName: string

  constructor(fileName: string, code: ImageFileErrorCode) {
    super(`${fileName}: ${code}`)
    this.name = 'ImageFileError'
    this.fileName = fileName
    this.code = code
  }
}

export function getSafeFileStem(fileName: string, fallback: string) {
  const stem = fileName.replace(/\.[^.]+$/, '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return stem || fallback
}

function isSupported(file: File) {
  const lowerName = file.name.toLowerCase()
  return file.type === 'image/png'
    || file.type === 'image/webp'
    || lowerName.endsWith('.png')
    || lowerName.endsWith('.webp')
}

export async function inspectImageFile(
  file: File,
  index: number,
  occurrence: number,
): Promise<PlaygroundAsset> {
  if (!isSupported(file)) {
    throw new ImageFileError(file.name, 'unsupported')
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new ImageFileError(file.name, 'decode')
  }

  const maxScanSize = 512
  const scale = Math.min(1, maxScanSize / Math.max(bitmap.width, bitmap.height))
  const scanWidth = Math.max(1, Math.round(bitmap.width * scale))
  const scanHeight = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = scanWidth
  canvas.height = scanHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (!context) {
    bitmap.close()
    throw new ImageFileError(file.name, 'inspect')
  }

  context.drawImage(bitmap, 0, 0, scanWidth, scanHeight)
  const pixels = context.getImageData(0, 0, scanWidth, scanHeight).data
  let hasTransparency = false
  let minX = scanWidth
  let minY = scanHeight
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < scanHeight; y += 1) {
    for (let x = 0; x < scanWidth; x += 1) {
      const alpha = pixels[(y * scanWidth + x) * 4 + 3]
      if (alpha < 250) hasTransparency = true
      if (alpha > 8) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  const width = bitmap.width
  const height = bitmap.height
  bitmap.close()

  if (!hasTransparency) {
    throw new ImageFileError(file.name, 'opaque')
  }

  if (maxX < minX || maxY < minY) {
    throw new ImageFileError(file.name, 'empty')
  }

  const visibleBounds: FloatUpVisibleBounds = {
    x: minX / scale,
    y: minY / scale,
    width: (maxX - minX + 1) / scale,
    height: (maxY - minY + 1) / scale,
  }
  const extension = file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp') ? 'webp' : 'png'
  const safeStem = getSafeFileStem(file.name, `ornament-${index + 1}`)
  const suffix = occurrence > 1 ? `-${occurrence}` : ''
  const fileName = `${safeStem}${suffix}.${extension}`
  const id = `${safeStem}${suffix}`
  const objectUrl = URL.createObjectURL(file)

  return {
    metadata: {
      id,
      src: objectUrl,
      width,
      height,
      visibleBounds,
    },
    exportSrc: `ornaments/${fileName}`,
    objectUrl,
    fileName,
  }
}

export function revokeAssets(assets: PlaygroundAsset[]) {
  assets.forEach((asset) => {
    if (asset.objectUrl) URL.revokeObjectURL(asset.objectUrl)
  })
}
