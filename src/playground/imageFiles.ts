import type { FloatUpImageMetadata, FloatUpVisibleBounds } from '../float-up'

export type PlaygroundAsset = {
  metadata: FloatUpImageMetadata
  exportSrc: string
  objectUrl?: string
  blob?: Blob
  fileName: string
}

export type ImageFileErrorCode = 'decode' | 'inspect' | 'empty' | 'missing' | 'unknown'

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

const portableImageTypes: Record<string, string> = {
  'image/png': 'png',
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
}

const imageTypeByExtension: Record<string, string> = {
  png: 'image/png',
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jfif: 'image/jpeg',
  gif: 'image/gif',
  avif: 'image/avif',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
}

export function getImageMimeType(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase()
  return (extension && imageTypeByExtension[extension]) || 'image/png'
}

function getPortableExtension(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension && imageTypeByExtension[extension]) return extension
  return portableImageTypes[file.type] ?? null
}

async function loadImage(file: File, objectUrl: string): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file)
  } catch {
    const image = new Image()
    image.src = objectUrl
    await image.decode()
    return image
  }
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not convert image')), 'image/png')
  })
}

export async function inspectImageFile(
  file: File,
  index: number,
  occurrence: number,
): Promise<PlaygroundAsset> {
  let objectUrl = URL.createObjectURL(file)
  let storedBlob: Blob = file
  let image: ImageBitmap | HTMLImageElement
  try {
    image = await loadImage(file, objectUrl)
  } catch {
    URL.revokeObjectURL(objectUrl)
    throw new ImageFileError(file.name, 'decode')
  }

  try {
    const width = image instanceof HTMLImageElement ? image.naturalWidth : image.width
    const height = image instanceof HTMLImageElement ? image.naturalHeight : image.height
    if (!width || !height) throw new ImageFileError(file.name, 'inspect')

    const maxScanSize = 512
    const scale = Math.min(1, maxScanSize / Math.max(width, height))
    const scanWidth = Math.max(1, Math.round(width * scale))
    const scanHeight = Math.max(1, Math.round(height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = scanWidth
    canvas.height = scanHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new ImageFileError(file.name, 'inspect')

    context.drawImage(image, 0, 0, scanWidth, scanHeight)
    const pixels = context.getImageData(0, 0, scanWidth, scanHeight).data
    let minX = scanWidth
    let minY = scanHeight
    let maxX = -1
    let maxY = -1

    for (let y = 0; y < scanHeight; y += 1) {
      for (let x = 0; x < scanWidth; x += 1) {
        const alpha = pixels[(y * scanWidth + x) * 4 + 3]
        if (alpha > 8) {
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }

    if (maxX < minX || maxY < minY) throw new ImageFileError(file.name, 'empty')

    const visibleBounds: FloatUpVisibleBounds = {
      x: minX / scale,
      y: minY / scale,
      width: (maxX - minX + 1) / scale,
      height: (maxY - minY + 1) / scale,
    }
    let extension = getPortableExtension(file)
    if (!extension) {
      const portableCanvas = document.createElement('canvas')
      portableCanvas.width = width
      portableCanvas.height = height
      const portableContext = portableCanvas.getContext('2d')
      if (!portableContext) throw new ImageFileError(file.name, 'inspect')
      portableContext.drawImage(image, 0, 0)
      const png = await canvasToPng(portableCanvas)
      URL.revokeObjectURL(objectUrl)
      objectUrl = URL.createObjectURL(png)
      storedBlob = png
      extension = 'png'
    }
    const safeStem = getSafeFileStem(file.name, `ornament-${index + 1}`)
    const suffix = occurrence > 1 ? `-${occurrence}` : ''
    const fileName = `${safeStem}${suffix}.${extension}`
    const id = `${safeStem}${suffix}`

    return {
      metadata: { id, src: objectUrl, width, height, visibleBounds },
      exportSrc: `ornaments/${fileName}`,
      objectUrl,
      blob: storedBlob,
      fileName,
    }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error instanceof ImageFileError ? error : new ImageFileError(file.name, 'inspect')
  } finally {
    if ('close' in image) image.close()
  }
}

export function revokeAssets(assets: PlaygroundAsset[]) {
  assets.forEach((asset) => {
    if (asset.objectUrl) URL.revokeObjectURL(asset.objectUrl)
  })
}
