import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import { unzipSync } from 'fflate'
import {
  createFloatUpLayout,
  DEFAULT_MOTION,
  FloatUp,
  type FloatUpConfig,
  type FloatUpController,
  type FloatUpItem,
  type FloatUpMotionConfig,
  type FloatUpReservedArea,
} from '../float-up'
import { EditorStage } from './EditorStage'
import { readDraft, writeDraft, type StoredDraft } from './draftStorage'
import { ExportDialog } from './ExportDialog'
import { buildWebsitePackage } from './exportPackage'
import { LandingBackdrop } from './LandingBackdrop'
import { MotionCurveEditor } from './MotionCurveEditor'
import {
  getImageMimeType,
  getSafeFileStem,
  ImageFileError,
  inspectImageFile,
  revokeAssets,
  type ImageFileErrorCode,
  type PlaygroundAsset,
} from './imageFiles'
import { getLayoutFileName, parseFloatUpConfig } from './layoutImport'
import { formatNotice, getInitialLocale, messages, type Locale, type Notice } from './i18n'

const baseUrl = import.meta.env.BASE_URL
const EMPTY_RESERVED_AREA: FloatUpReservedArea = { x: 0, y: 0, width: 0, height: 0 }

function createDemoAssets(): PlaygroundAsset[] {
  const definitions = [
    { id: 'golden-star', fileName: 'golden-star.png', size: [1254, 1254], bounds: [0, 19, 1238, 1209] },
    { id: 'coral-ring', fileName: 'coral-ring.png', size: [1254, 1254], bounds: [39, 53, 1161, 1175] },
    { id: 'blue-swirl', fileName: 'blue-swirl.png', size: [1254, 1254], bounds: [0, 40, 1232, 1214] },
    { id: 'lavender-flower', fileName: 'lavender-flower.png', size: [1254, 1254], bounds: [180, 115, 893, 996] },
    { id: 'orange-gem', fileName: 'orange-gem.png', size: [1254, 1254], bounds: [206, 121, 843, 1012] },
  ] as const

  return definitions.map(({ id, fileName, size, bounds }) => ({
    metadata: {
      id,
      src: `${baseUrl}demo/${fileName}`,
      width: size[0],
      height: size[1],
      visibleBounds: {
        x: bounds[0],
        y: bounds[1],
        width: bounds[2],
        height: bounds[3],
      },
    },
    exportSrc: `ornaments/${fileName}`,
    fileName,
  }))
}

function makeLayout(assets: PlaygroundAsset[], motion?: FloatUpMotionConfig, reservedArea?: FloatUpReservedArea) {
  const layout = createFloatUpLayout(assets.map((asset) => asset.metadata), { reservedArea: reservedArea ?? EMPTY_RESERVED_AREA })
  if (motion) {
    layout.motion = {
      durationMs: motion.durationMs,
      easing: { ...motion.easing },
    }
  }
  return layout
}

function makeDemoLayout(assets: PlaygroundAsset[]) {
  const layout = makeLayout(assets)
  const examples = [
    { x: 0.38, y: 0.46, width: 0.11, rotation: -9, directionDeg: 255, durationMs: 3200 },
    { x: 0.56, y: 0.55, width: 0.12, rotation: 8, directionDeg: 280, durationMs: 3900 },
  ]
  return {
    ...layout,
    items: layout.items.map((item, index) => ({
      ...item,
      ...(examples[index] ? {
        target: { x: examples[index].x, y: examples[index].y },
        width: examples[index].width,
        rotation: examples[index].rotation,
      } : {}),
      motion: {
        durationMs: examples[index]?.durationMs ?? DEFAULT_MOTION.durationMs,
        easing: { ...DEFAULT_MOTION.easing },
        directionDeg: examples[index]?.directionDeg ?? 270,
      },
    })),
  }
}

function createStoredDraft(assets: PlaygroundAsset[], config: FloatUpConfig, usingDemo: boolean): StoredDraft {
  const assetsById = new Map(assets.map((asset) => [asset.metadata.id, asset]))
  return {
    version: 1,
    usingDemo,
    config: {
      ...config,
      items: config.items.map((item) => ({
        ...item,
        src: assetsById.get(item.id)?.exportSrc ?? item.src,
      })),
    },
    assets: assets.map((asset) => ({
      fileName: asset.fileName,
      metadata: { ...asset.metadata, src: asset.exportSrc },
      ...(asset.blob ? { blob: asset.blob } : {}),
    })),
  }
}

function restoreStoredDraft(value: unknown): { assets: PlaygroundAsset[]; config: FloatUpConfig; usingDemo: boolean } | null {
  if (!value || typeof value !== 'object') return null
  const draft = value as StoredDraft
  const config = parseFloatUpConfig(draft.config)
  if (draft.version !== 1 || !config || !Array.isArray(draft.assets)
    || draft.assets.length !== config.items.length || typeof draft.usingDemo !== 'boolean') return null
  if (!draft.assets.every((asset) => asset && typeof asset.fileName === 'string'
    && asset.metadata && typeof asset.metadata.id === 'string'
    && typeof asset.metadata.src === 'string'
    && Number.isFinite(asset.metadata.width) && asset.metadata.width > 0
    && Number.isFinite(asset.metadata.height) && asset.metadata.height > 0
    && asset.metadata.visibleBounds
    && Number.isFinite(asset.metadata.visibleBounds.x)
    && Number.isFinite(asset.metadata.visibleBounds.y)
    && Number.isFinite(asset.metadata.visibleBounds.width)
    && Number.isFinite(asset.metadata.visibleBounds.height))) return null

  const demosByFileName = new Map(createDemoAssets().map((asset) => [asset.fileName, asset]))
  const storedById = new Map(draft.assets.map((asset) => [asset.metadata?.id, asset]))
  const assets: PlaygroundAsset[] = []
  try {
    for (const item of config.items) {
      const stored = storedById.get(item.id)
      const fileName = getLayoutFileName(item.src)
      if (!stored || !fileName || stored.fileName !== fileName || stored.metadata?.src !== item.src) {
        throw new Error('Invalid saved asset')
      }

      const demo = demosByFileName.get(fileName)
      if (!stored.blob && !demo) throw new Error('Missing saved image')
      if (stored.blob && !(stored.blob instanceof Blob)) throw new Error('Invalid saved image')
      const objectUrl = stored.blob ? URL.createObjectURL(stored.blob) : undefined
      const source = objectUrl ?? demo!.metadata.src
      assets.push({
        fileName,
        exportSrc: `ornaments/${fileName}`,
        metadata: { ...stored.metadata, src: source },
        ...(objectUrl ? { objectUrl, blob: stored.blob } : {}),
      })
    }
    return {
      assets,
      config: { ...config, items: config.items.map((item, index) => ({ ...item, src: assets[index].metadata.src })) },
      usingDemo: draft.usingDemo,
    }
  } catch {
    revokeAssets(assets)
    return null
  }
}

type CenterCopy = (typeof messages)[Locale]['center']

type Page = 'intro' | 'editor'
type DropPoint = { x: number; y: number; aspectRatio: number }
type ItemPreview = { item: FloatUpItem; run: number }

function getPageFromUrl(): Page {
  return window.location.hash === '#/editor' ? 'editor' : 'intro'
}

async function unpackWebsitePackage(file: File): Promise<File[]> {
  const archive = unzipSync(new Uint8Array(await file.arrayBuffer()), {
    filter: (entry) => entry.name === 'float-up-layout.json'
      ? entry.originalSize <= 2_000_000
      : entry.name === `ornaments/${getLayoutFileName(entry.name)}` && entry.originalSize <= 25_000_000,
  })
  const layout = archive['float-up-layout.json']
  if (!layout) throw new Error('Missing layout JSON')
  return [
    new File([new Uint8Array(layout)], 'float-up-layout.json', { type: 'application/json' }),
    ...Object.entries(archive)
      .filter(([name]) => name.startsWith('ornaments/'))
      .map(([name, bytes]) => new File(
        [new Uint8Array(bytes)],
        name.replace('ornaments/', ''),
        { type: getImageMimeType(name) },
      )),
  ]
}

function CenterCard({ copy, onStart }: { copy: CenterCopy; onStart: () => void }) {
  return (
    <article className="center-card">
      <div
        className="center-card-art"
        aria-hidden="true"
        style={{
          WebkitMaskImage: `url("${baseUrl}landing/card/mask.svg")`,
          maskImage: `url("${baseUrl}landing/card/mask.svg")`,
        }}
      >
        <img src={`${baseUrl}landing/card/flowers.png`} alt="" draggable={false} />
      </div>
      <h1>float up</h1>
      <p>{copy.description}</p>
      <button className="start-button" type="button" onClick={onStart}>{copy.startMaking}</button>
    </article>
  )
}

function LanguageTabs({ locale, label, onChange }: { locale: Locale; label: string; onChange: (locale: Locale) => void }) {
  return (
    <div className="language-tabs" role="tablist" aria-label={label}>
      <button type="button" role="tab" aria-selected={locale === 'zh'} className={locale === 'zh' ? 'is-active' : ''} onClick={() => onChange('zh')}>中文</button>
      <button type="button" role="tab" aria-selected={locale === 'en'} className={locale === 'en' ? 'is-active' : ''} onClick={() => onChange('en')}>EN</button>
    </div>
  )
}

export function Playground() {
  const initialAssets = useMemo(() => createDemoAssets().filter((asset) => asset.metadata.id === 'golden-star' || asset.metadata.id === 'lavender-flower'), [])
  const initialLayout = useMemo(() => makeDemoLayout(initialAssets), [initialAssets])
  const [assets, setAssets] = useState<PlaygroundAsset[]>(initialAssets)
  const [config, setConfig] = useState<FloatUpConfig>(initialLayout)
  const [locale, setLocale] = useState<Locale>(getInitialLocale)
  const [page, setPage] = useState<Page>(getPageFromUrl)
  const [fullPreviewRun, setFullPreviewRun] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [itemPreview, setItemPreview] = useState<ItemPreview | null>(null)
  const [errors, setErrors] = useState<Array<{ fileName: string; code: ImageFileErrorCode }>>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const [isExportOpen, setExportOpen] = useState(false)
  const [notice, setNotice] = useState<Notice>({ key: 'intro' })
  const [draftReady, setDraftReady] = useState(false)
  const [draftSaveFailed, setDraftSaveFailed] = useState(false)
  const floatUpRef = useRef<FloatUpController>(null)
  const itemPreviewRef = useRef<FloatUpController>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const assetsRef = useRef(assets)
  const configRef = useRef(config)
  const isUsingDemoRef = useRef(true)
  const mountedRef = useRef(true)
  const importGenerationRef = useRef(0)
  const pendingJobsRef = useRef(0)
  const jobQueueRef = useRef(Promise.resolve())
  const draftSaveQueueRef = useRef(Promise.resolve())
  const draftSaveTimerRef = useRef<number | null>(null)
  const draftSnapshotRef = useRef<StoredDraft | null>(null)
  assetsRef.current = assets
  configRef.current = config

  const metadata = useMemo(
    () => new Map(assets.map((asset) => [asset.metadata.id, asset.metadata])),
    [assets],
  )
  const selectedItem = config.items.find((item) => item.id === selectedId) ?? null
  const activeItemPreview = fullPreviewRun === null && selectedItem?.id === itemPreview?.item.id ? itemPreview : null
  const itemPreviewConfig = useMemo<FloatUpConfig | null>(() => activeItemPreview ? {
    version: 1,
    reservedArea: EMPTY_RESERVED_AREA,
    motion: config.motion,
    items: [activeItemPreview.item],
  } : null, [activeItemPreview, config.motion])
  const copy = messages[locale]
  const closeExportDialog = useCallback(() => setExportOpen(false), [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      revokeAssets(assetsRef.current)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void readDraft().then((value) => {
      if (cancelled) return
      const restored = value === undefined ? null : restoreStoredDraft(value)
      if (restored) applyProject(restored.assets, restored.config, restored.usingDemo)
      else if (value !== undefined) setDraftSaveFailed(true)
      setDraftReady(true)
    }).catch(() => {
      if (!cancelled) {
        setDraftSaveFailed(true)
        setDraftReady(true)
      }
    })
    return () => { cancelled = true }
  }, [])

  const queueDraftSave = (draft: StoredDraft) => {
    draftSaveQueueRef.current = draftSaveQueueRef.current.catch(() => {}).then(() => writeDraft(draft))
    void draftSaveQueueRef.current.then(
      () => { if (mountedRef.current) setDraftSaveFailed(false) },
      () => { if (mountedRef.current) setDraftSaveFailed(true) },
    )
  }

  useEffect(() => {
    if (!draftReady) return
    const snapshot = createStoredDraft(assets, config, isUsingDemoRef.current)
    draftSnapshotRef.current = snapshot
    draftSaveTimerRef.current = window.setTimeout(() => {
      draftSaveTimerRef.current = null
      queueDraftSave(snapshot)
    }, 150)
    return () => {
      if (draftSaveTimerRef.current !== null) window.clearTimeout(draftSaveTimerRef.current)
    }
  }, [assets, config, draftReady])

  useEffect(() => {
    if (!draftReady) return
    const flushDraft = () => {
      if (draftSaveTimerRef.current === null || !draftSnapshotRef.current) return
      window.clearTimeout(draftSaveTimerRef.current)
      draftSaveTimerRef.current = null
      queueDraftSave(draftSnapshotRef.current)
    }
    window.addEventListener('pagehide', flushDraft)
    const saveWhenHidden = () => {
      if (document.visibilityState === 'hidden') flushDraft()
    }
    document.addEventListener('visibilitychange', saveWhenHidden)
    return () => {
      window.removeEventListener('pagehide', flushDraft)
      document.removeEventListener('visibilitychange', saveWhenHidden)
    }
  }, [draftReady])

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
    document.title = locale === 'zh'
      ? page === 'intro' ? 'Float Up — 可视化动效编辑器' : 'Float Up — 动效编辑器'
      : page === 'intro' ? 'Float Up — visual motion editor' : 'Float Up — motion editor'
    try {
      window.localStorage.setItem('float-up-locale', locale)
    } catch {
      // The switch still works when browser storage is unavailable.
    }
  }, [locale, page])

  useEffect(() => {
    if (notice.key === 'intro' || notice.key === 'exporting') return
    const timeout = window.setTimeout(() => setNotice({ key: 'intro' }), 4000)
    return () => window.clearTimeout(timeout)
  }, [notice])

  useLayoutEffect(() => {
    if (!activeItemPreview || page !== 'editor') return
    itemPreviewRef.current?.replay()
    const durationMs = activeItemPreview.item.motion?.durationMs ?? config.motion?.durationMs ?? DEFAULT_MOTION.durationMs
    const timeout = window.setTimeout(() => {
      setItemPreview((current) => current?.run === activeItemPreview.run ? null : current)
    }, durationMs + 300)
    return () => window.clearTimeout(timeout)
  }, [activeItemPreview, config.motion?.durationMs, page])

  useLayoutEffect(() => {
    if (fullPreviewRun === null || page !== 'editor') return
    floatUpRef.current?.replay()
    const durationMs = Math.max(
      config.motion?.durationMs ?? DEFAULT_MOTION.durationMs,
      ...config.items.map((item) => item.motion?.durationMs ?? 0),
    )
    const timeout = window.setTimeout(() => {
      setFullPreviewRun((current) => current === fullPreviewRun ? null : current)
      setNotice((current) => current.key === 'replaying' ? { key: 'intro' } : current)
    }, durationMs + 500)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullPreviewRun(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [fullPreviewRun, config, page])

  useEffect(() => {
    const syncPage = () => {
      setPage(getPageFromUrl())
      setItemPreview(null)
      setFullPreviewRun(null)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    window.addEventListener('popstate', syncPage)
    window.addEventListener('hashchange', syncPage)
    return () => {
      window.removeEventListener('popstate', syncPage)
      window.removeEventListener('hashchange', syncPage)
    }
  }, [])

  const navigateTo = (nextPage: Page) => {
    const url = nextPage === 'editor'
      ? `${window.location.pathname}${window.location.search}#/editor`
      : `${window.location.pathname}${window.location.search}`
    window.history.pushState(null, '', url)
    setPage(nextPage)
    setItemPreview(null)
    setFullPreviewRun(null)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const applyProject = (
    nextAssets: PlaygroundAsset[],
    nextLayout: FloatUpConfig,
    usingDemo: boolean,
    keepEditing = false,
  ) => {
    const retainedUrls = new Set(nextAssets.map((asset) => asset.objectUrl))
    revokeAssets(assetsRef.current.filter((asset) => !retainedUrls.has(asset.objectUrl)))
    assetsRef.current = nextAssets
    configRef.current = nextLayout
    isUsingDemoRef.current = usingDemo
    setAssets(nextAssets)
    setConfig(nextLayout)
    setItemPreview(null)
    if (!keepEditing) {
      setSelectedId(null)
    }
  }

  const enqueueJob = (job: (generation: number) => Promise<void>) => {
    const generation = importGenerationRef.current
    pendingJobsRef.current += 1
    setIsProcessing(true)
    jobQueueRef.current = jobQueueRef.current
      .then(() => generation === importGenerationRef.current && mountedRef.current ? job(generation) : undefined)
      .catch(() => {
        if (mountedRef.current) setNotice({ key: 'importFailed' })
      })
      .then(() => {
        pendingJobsRef.current -= 1
        if (mountedRef.current) setIsProcessing(pendingJobsRef.current > 0)
      })
  }

  const processFiles = async (files: File[], generation: number, dropPoint?: DropPoint) => {
    setErrors([])
    const nextAssets: PlaygroundAsset[] = []
    const nextErrors: Array<{ fileName: string; code: ImageFileErrorCode }> = []
    const replaceDemo = isUsingDemoRef.current
    const usedIds = new Set(replaceDemo ? [] : assetsRef.current.map((asset) => asset.metadata.id))

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      const stem = getSafeFileStem(file.name, `ornament-${index + 1}`)
      let occurrence = 1
      while (usedIds.has(occurrence === 1 ? stem : `${stem}-${occurrence}`)) occurrence += 1

      try {
        const asset = await inspectImageFile(file, index, occurrence)
        nextAssets.push(asset)
        usedIds.add(asset.metadata.id)
      } catch (error) {
        nextErrors.push(error instanceof ImageFileError
          ? { fileName: error.fileName, code: error.code }
          : { fileName: file.name, code: 'unknown' })
      }
    }

    if (generation !== importGenerationRef.current || !mountedRef.current) {
      revokeAssets(nextAssets)
      return
    }

    if (nextAssets.length > 0) {
      if (replaceDemo) {
        const layout = makeLayout(nextAssets, configRef.current.motion)
        if (dropPoint) {
          layout.items = layout.items.map((item, index) => {
            const image = nextAssets[index].metadata
            const height = item.width * image.height / image.width * dropPoint.aspectRatio
            return {
              ...item,
              target: {
                x: Math.min(1 - item.width / 2, Math.max(item.width / 2, dropPoint.x + index * 0.035)),
                y: Math.min(1 - height / 2, Math.max(height / 2, dropPoint.y + index * 0.035)),
              },
            }
          })
        }
        applyProject(nextAssets, layout, false)
      } else {
        const allAssets = [...assetsRef.current, ...nextAssets]
        const automatic = makeLayout(allAssets, configRef.current.motion, configRef.current.reservedArea)
        const additions = new Set(nextAssets.map((asset) => asset.metadata.id))
        const addedItems = automatic.items.filter((item) => additions.has(item.id)).map((item) => {
            if (!dropPoint) return item
            const addedIndex = nextAssets.findIndex((asset) => asset.metadata.id === item.id)
            const image = nextAssets[addedIndex].metadata
            const height = item.width * image.height / image.width * dropPoint.aspectRatio
            return {
              ...item,
              target: {
                x: Math.min(1 - item.width / 2, Math.max(item.width / 2, dropPoint.x + addedIndex * 0.035)),
                y: Math.min(1 - height / 2, Math.max(height / 2, dropPoint.y + addedIndex * 0.035)),
              },
            }
          })
        const nextLayout = {
          ...automatic,
          items: [...configRef.current.items, ...addedItems],
        }
        applyProject(allAssets, nextLayout, false, true)
      }
      setSelectedId(nextAssets[0].metadata.id)
      setNotice({ key: 'arranged', count: nextAssets.length })
    }
    setErrors(nextErrors)
  }

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length > 0) {
      setFullPreviewRun(null)
      enqueueJob((generation) => files.some((file) => /\.(?:json|zip)$/i.test(file.name))
        ? processLayoutImport(files, generation)
        : processFiles(files, generation))
    }
    event.target.value = ''
  }

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setIsDraggingFiles(false)
    const files = Array.from(event.dataTransfer.files)
    const stage = event.currentTarget.querySelector<HTMLElement>('.editor-stage, .float-up-stage')
    const bounds = stage?.getBoundingClientRect()
    const dropPoint = bounds && event.clientX >= bounds.left && event.clientX <= bounds.right
      && event.clientY >= bounds.top && event.clientY <= bounds.bottom
      ? {
          x: (event.clientX - bounds.left) / bounds.width,
          y: (event.clientY - bounds.top) / bounds.height,
          aspectRatio: bounds.width / bounds.height,
        }
      : undefined
    if (!dropPoint && !files.some((file) => /\.(?:json|zip)$/i.test(file.name))) return
    setFullPreviewRun(null)
    if (files.length > 0) enqueueJob((generation) => files.some((file) => /\.(?:json|zip)$/i.test(file.name))
      ? processLayoutImport(files, generation)
      : processFiles(files, generation, dropPoint))
  }

  const processLayoutImport = async (files: File[], generation: number) => {
    setErrors([])
    let inputFiles = files
    if (files.length === 1 && files[0].name.toLowerCase().endsWith('.zip')) {
      try {
        inputFiles = await unpackWebsitePackage(files[0])
      } catch {
        setNotice({ key: 'importFailed' })
        return
      }
    }
    if (generation !== importGenerationRef.current || !mountedRef.current) return
    const jsonFiles = inputFiles.filter((file) => file.name.toLowerCase().endsWith('.json'))
    if (jsonFiles.length !== 1) {
      setNotice({ key: 'importFailed' })
      return
    }

    let imported: FloatUpConfig | null = null
    try {
      imported = parseFloatUpConfig(JSON.parse(await jsonFiles[0].text()))
    } catch {
      // Report malformed JSON with the same actionable import notice.
    }
    if (generation !== importGenerationRef.current || !mountedRef.current) return
    if (!imported) {
      setNotice({ key: 'importFailed' })
      return
    }

    const imageFiles = inputFiles.filter((file) => file !== jsonFiles[0])
    const inspected: PlaygroundAsset[] = []
    const nextErrors: Array<{ fileName: string; code: ImageFileErrorCode }> = []
    const usedIds = new Set<string>()
    for (let index = 0; index < imageFiles.length; index += 1) {
      const file = imageFiles[index]
      const stem = getSafeFileStem(file.name, `ornament-${index + 1}`)
      let occurrence = 1
      while (usedIds.has(occurrence === 1 ? stem : `${stem}-${occurrence}`)) occurrence += 1
      try {
        const asset = await inspectImageFile(file, index, occurrence)
        inspected.push(asset)
        usedIds.add(asset.metadata.id)
      } catch (error) {
        nextErrors.push(error instanceof ImageFileError
          ? { fileName: error.fileName, code: error.code }
          : { fileName: file.name, code: 'unknown' })
      }
    }

    if (generation !== importGenerationRef.current || !mountedRef.current) {
      revokeAssets(inspected)
      return
    }

    const candidates = [...inspected, ...assetsRef.current, ...createDemoAssets()]
    const nextAssets: PlaygroundAsset[] = []
    for (const item of imported.items) {
      const fileName = getLayoutFileName(item.src)!
      const match = candidates.find((asset) => asset.fileName === fileName)
      if (!match) {
        nextErrors.push({ fileName, code: 'missing' })
        continue
      }
      nextAssets.push({
        ...match,
        fileName,
        exportSrc: `ornaments/${fileName}`,
        metadata: { ...match.metadata, id: item.id },
      })
    }

    setErrors(nextErrors)
    if (nextAssets.length !== imported.items.length) {
      revokeAssets(inspected)
      setNotice({ key: 'importMissingImages' })
      return
    }

    const usedUrls = new Set(nextAssets.map((asset) => asset.objectUrl))
    revokeAssets(inspected.filter((asset) => !usedUrls.has(asset.objectUrl)))

    const nextLayout: FloatUpConfig = {
      ...imported,
      items: imported.items.map((item, index) => ({ ...item, src: nextAssets[index].metadata.src })),
    }
    applyProject(nextAssets, nextLayout, false)
    setNotice({ key: 'imported', count: nextAssets.length })
  }

  const playFullPreview = () => {
    setItemPreview(null)
    setFullPreviewRun((current) => (current ?? 0) + 1)
    setNotice({
      key: 'replaying',
      durationMs: Math.max((config.motion ?? DEFAULT_MOTION).durationMs, ...config.items.map((item) => item.motion?.durationMs ?? 0)),
    })
  }

  const previewSelectedItem = () => {
    if (!selectedItem) return
    setItemPreview((current) => ({ item: selectedItem, run: (current?.run ?? 0) + 1 }))
  }

  const selectItem = (id: string | null) => {
    setItemPreview((current) => current?.item.id === id ? current : null)
    setSelectedId(id)
  }

  const updateSelected = (updater: (item: FloatUpItem) => FloatUpItem) => {
    if (!selectedId) return
    setConfig((current) => ({
      ...current,
      items: current.items.map((item) => item.id === selectedId ? updater(item) : item),
    }))
  }

  const setExitMode = (exitMode: NonNullable<FloatUpItem['exitMode']>) => {
    if (!selectedItem || (selectedItem.exitMode ?? 'stop') === exitMode) return
    const nextItem = { ...selectedItem, exitMode }
    updateSelected(() => nextItem)
    setItemPreview((current) => ({ item: nextItem, run: (current?.run ?? 0) + 1 }))
  }

  const updateMotion = (motion: FloatUpMotionConfig) => updateSelected((item) => ({
    ...item,
    motion: { ...motion, easing: { ...motion.easing }, directionDeg: item.motion?.directionDeg ?? 270 },
  }))

  const deleteItem = (id: string) => {
    setItemPreview((current) => current?.item.id === id ? null : current)
    const removedAsset = assets.find((asset) => asset.metadata.id === id)
    if (removedAsset?.objectUrl) URL.revokeObjectURL(removedAsset.objectUrl)
    assetsRef.current = assetsRef.current.filter((asset) => asset.metadata.id !== id)
    setAssets(assetsRef.current)
    setConfig((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }))
    setSelectedId((current) => current === id ? null : current)
    setNotice({ key: 'removed' })
  }

  const reorderItem = (id: string, direction: -1 | 1) => {
    setConfig((current) => {
      const index = current.items.findIndex((item) => item.id === id)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= current.items.length) return current
      const items = [...current.items]
      ;[items[index], items[nextIndex]] = [items[nextIndex], items[index]]
      return { ...current, items }
    })
  }

  const getExportConfig = (): FloatUpConfig => ({
    ...config,
    reservedArea: { ...config.reservedArea },
    items: config.items.map((item) => ({
      ...item,
      motion: item.motion ?? { ...(config.motion ?? DEFAULT_MOTION), directionDeg: 270 },
      src: assets.find((asset) => asset.metadata.id === item.id)?.exportSrc ?? item.src,
      target: { ...item.target },
    })),
  })

  const downloadPackage = () => {
    const exported = getExportConfig()
    const currentAssets = [...assets]
    setNotice({ key: 'exporting' })
    enqueueJob(async (generation) => {
      try {
        const blob = await buildWebsitePackage(exported, currentAssets)
        if (generation !== importGenerationRef.current || !mountedRef.current) return
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = 'float-up-website.zip'
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
        setExportOpen(false)
        setNotice({ key: 'exported' })
      } catch {
        if (mountedRef.current) setNotice({ key: 'exportFailed' })
      }
    })
  }

  if (!draftReady) {
    return <main className="draft-loading" role="status" aria-busy="true">{copy.draftLoading}</main>
  }

  if (page === 'intro') {
    return (
      <main className="landing-page">
        <div className="landing-top-actions">
          <a
            className="landing-github-link"
            href="https://github.com/SaiSai-me/float-up"
            target="_blank"
            rel="noreferrer"
            aria-label={copy.githubLabel}
          >
            GitHub <span aria-hidden="true">↗</span>
          </a>
          <LanguageTabs locale={locale} label={copy.languageLabel} onChange={setLocale} />
        </div>

        <section className="landing-hero" aria-label={copy.landingLabel}>
          <LandingBackdrop />
          <div className="landing-content">
            <CenterCard copy={copy.center} onStart={() => navigateTo('editor')} />
          </div>
        </section>
        {draftSaveFailed && <p className="draft-storage-error" role="alert">{copy.draftSaveFailed}</p>}
      </main>
    )
  }

  return (
    <main
      className="playground"
      onDragEnter={(event) => {
        event.preventDefault()
        setIsDraggingFiles(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDraggingFiles(false)
      }}
      onDrop={onDrop}
    >
      <header className="playground-toolbar">
        <button className="toolbar-back" type="button" onClick={() => navigateTo('intro')} aria-label={copy.toolbar.backIntro} title={copy.toolbar.backIntro}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14.5 5-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="toolbar-actions">
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="image/*,.heic,.heif,.tif,.tiff,.json,.zip,application/json,application/zip"
            multiple
            onChange={onFileChange}
          />
          <button className="button toolbar-add" type="button" disabled={isProcessing} onClick={() => fileInputRef.current?.click()} aria-label={copy.toolbar.addImages} title={copy.toolbar.addImages}>＋</button>
          <button className="button toolbar-play" type="button" onClick={playFullPreview} disabled={config.items.length === 0} aria-label={copy.toolbar.playPreview} title={copy.toolbar.playPreview}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8.5 5.6c-.7-.45-1.6.1-1.6.9v11c0 .8.9 1.35 1.6.9l9-5.5c.7-.4.7-1.4 0-1.8l-9-5.5Z" fill="currentColor" /></svg>
          </button>
        </div>
        <h1 className="toolbar-title"><img src={`${baseUrl}brand/float-up-icon.png`} alt="" />float up</h1>
        <div className="toolbar-actions toolbar-actions-right">
          <button className="button toolbar-export" type="button" onClick={() => setExportOpen(true)} disabled={assets.length === 0 || isProcessing}>{copy.toolbar.exportPackage}</button>
        </div>
      </header>

      {notice.key !== 'intro' && <p className="toolbar-notice" role="status">{formatNotice(locale, notice)}</p>}
      {draftSaveFailed && <p className="draft-storage-error" role="alert">{copy.draftSaveFailed}</p>}

      {errors.length > 0 && (
        <aside className="error-panel" aria-live="polite">
          <div>
            <strong>{copy.errors.heading}</strong>
            {errors.map((error, index) => <p key={`${error.fileName}-${error.code}-${index}`}>{error.fileName}: {copy.errors[error.code]}</p>)}
          </div>
          <button type="button" onClick={() => setErrors([])} aria-label={copy.errors.dismiss}>×</button>
        </aside>
      )}

      <section className="playground-track" aria-label={copy.playgroundLabel}>
        <div className="playground-sticky-stage">
          <EditorStage
            config={config}
            metadata={metadata}
            selectedId={selectedId}
            previewingId={activeItemPreview?.item.id ?? null}
            onSelect={selectItem}
            onChange={setConfig}
            onDelete={deleteItem}
            onReorder={reorderItem}
            labels={copy.editor}
          />

          {itemPreviewConfig && (
            <div className="editor-item-preview" aria-hidden="true">
              <FloatUp ref={itemPreviewRef} config={itemPreviewConfig} scroll={false} />
            </div>
          )}

          {selectedItem && (
            <aside className="editor-inspector" aria-label={copy.editor.ariaLabel}>
              <div className="inspector-heading">
                <div className="inspector-selected">
                  <img src={selectedItem.src} alt="" />
                  <div>
                    <span>{copy.editor.heading}</span>
                    <strong>{selectedItem.id}</strong>
                  </div>
                </div>
                <button type="button" onClick={() => selectItem(null)} aria-label={copy.editor.close}>×</button>
              </div>
              <div className="inspector-finish-mode" role="group" aria-label={copy.editor.finishMode}>
                <span>{copy.editor.finishMode}</span>
                <div>
                  <button type="button" className={selectedItem.exitMode !== 'fly-out' ? 'is-active' : ''} aria-pressed={selectedItem.exitMode !== 'fly-out'} title={copy.editor.stopHelp} onClick={() => setExitMode('stop')}>{copy.editor.stop}</button>
                  <button type="button" className={selectedItem.exitMode === 'fly-out' ? 'is-active' : ''} aria-pressed={selectedItem.exitMode === 'fly-out'} title={copy.editor.flyOutHelp} onClick={() => setExitMode('fly-out')}>{copy.editor.flyOut}</button>
                </div>
              </div>
              <MotionCurveEditor
                key={selectedItem.id}
                value={selectedItem.motion ?? config.motion ?? DEFAULT_MOTION}
                labels={copy.editor.motion}
                onChange={updateMotion}
              />
              <div className="inspector-actions">
                <button className="is-primary" type="button" onClick={previewSelectedItem}>{copy.editor.motion.preview}</button>
                <button type="button" onClick={() => updateMotion(DEFAULT_MOTION)}>{copy.editor.motion.reset}</button>
                <button className="is-danger" type="button" onClick={() => deleteItem(selectedItem.id)}>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4.5 7h15M9 7V4.5h6V7m-9 0 .8 12.5h10.4L18 7M10 10.5v6m4-6v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {copy.editor.delete}
                </button>
              </div>
            </aside>
          )}

          {fullPreviewRun !== null && (
            <div className="playground-full-preview" aria-label={copy.toolbar.playPreview}>
              <FloatUp ref={floatUpRef} config={config} assetBaseUrl={baseUrl} scroll={false} className="playground-preview" />
            </div>
          )}
        </div>
      </section>

      {isDraggingFiles && (
        <div className="drop-overlay" aria-hidden="true">
          <div>
            <span>＋</span>
            <strong>{copy.drop.title}</strong>
            <p>{copy.drop.detail}</p>
          </div>
        </div>
      )}
      {isExportOpen && (
        <ExportDialog
          config={config}
          copy={copy.exportDialog}
          isProcessing={isProcessing}
          failed={notice.key === 'exportFailed'}
          onClose={closeExportDialog}
          onDownload={downloadPackage}
        />
      )}
    </main>
  )
}
