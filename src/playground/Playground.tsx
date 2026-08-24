import {
  useMemo,
  useRef,
  useState,
  useEffect,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import {
  createFloatUpLayout,
  FloatUp,
  type FloatUpConfig,
  type FloatUpController,
  type FloatUpImageMetadata,
  type FloatUpItem,
} from '../float-up'
import { EditorStage } from './EditorStage'
import {
  getSafeFileStem,
  ImageFileError,
  inspectImageFile,
  revokeAssets,
  type ImageFileErrorCode,
  type PlaygroundAsset,
} from './imageFiles'
import { formatNotice, getInitialLocale, messages, type Locale, type Notice } from './i18n'

const baseUrl = import.meta.env.BASE_URL

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
    exportSrc: `/ornaments/${fileName}`,
    fileName,
  }))
}

function makeLayout(assets: PlaygroundAsset[]) {
  return createFloatUpLayout(assets.map((asset) => asset.metadata))
}

type CenterCopy = (typeof messages)[Locale]['center']

function CenterCard({ editing, copy }: { editing: boolean; copy: CenterCopy }) {
  return (
    <article className={`center-card${editing ? ' is-editing' : ''}`}>
      <span className="center-eyebrow">{copy.eyebrow}</span>
      <h1>Float Up</h1>
      <p>{copy.description}</p>
      <ol aria-label={copy.workflowLabel}>
        {copy.steps.map((step, index) => <li key={step}><span>{index + 1}</span> {step}</li>)}
      </ol>
      {editing && <strong>{copy.reserved}</strong>}
    </article>
  )
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

export function Playground() {
  const initialAssets = useMemo(createDemoAssets, [])
  const initialLayout = useMemo(() => makeLayout(initialAssets), [initialAssets])
  const [assets, setAssets] = useState<PlaygroundAsset[]>(initialAssets)
  const [config, setConfig] = useState<FloatUpConfig>(initialLayout)
  const [autoConfig, setAutoConfig] = useState<FloatUpConfig>(initialLayout)
  const [locale, setLocale] = useState<Locale>(getInitialLocale)
  const [editing, setEditing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Array<{ fileName: string; code: ImageFileErrorCode }>>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const [notice, setNotice] = useState<Notice>({ key: 'intro' })
  const floatUpRef = useRef<FloatUpController>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const assetsRef = useRef(assets)
  assetsRef.current = assets

  const metadata = useMemo(
    () => new Map(assets.map((asset) => [asset.metadata.id, asset.metadata])),
    [assets],
  )
  const selectedItem = config.items.find((item) => item.id === selectedId) ?? null
  const copy = messages[locale]

  useEffect(() => () => revokeAssets(assetsRef.current), [])

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
    document.title = locale === 'zh'
      ? 'Float Up — React 漂浮元素动效'
      : 'Float Up — floating ornaments for React'
    try {
      window.localStorage.setItem('float-up-locale', locale)
    } catch {
      // The switch still works when browser storage is unavailable.
    }
  }, [locale])

  const replaceWithAssets = (nextAssets: PlaygroundAsset[]) => {
    revokeAssets(assetsRef.current)
    const nextLayout = makeLayout(nextAssets)
    setAssets(nextAssets)
    setConfig(nextLayout)
    setAutoConfig(nextLayout)
    setSelectedId(null)
    setEditing(false)
  }

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return
    setIsProcessing(true)
    setErrors([])
    const nextAssets: PlaygroundAsset[] = []
    const nextErrors: Array<{ fileName: string; code: ImageFileErrorCode }> = []
    const occurrences = new Map<string, number>()

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      const occurrenceKey = getSafeFileStem(file.name, `ornament-${index + 1}`)
      const occurrence = (occurrences.get(occurrenceKey) ?? 0) + 1
      occurrences.set(occurrenceKey, occurrence)

      try {
        nextAssets.push(await inspectImageFile(file, index, occurrence))
      } catch (error) {
        nextErrors.push(error instanceof ImageFileError
          ? { fileName: error.fileName, code: error.code }
          : { fileName: file.name, code: 'unknown' })
      }
    }

    if (nextAssets.length > 0) {
      replaceWithAssets(nextAssets)
      setNotice({ key: 'arranged', count: nextAssets.length })
    }
    setErrors(nextErrors)
    setIsProcessing(false)
  }

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void processFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setIsDraggingFiles(false)
    void processFiles(Array.from(event.dataTransfer.files))
  }

  const replay = () => {
    setEditing(false)
    setSelectedId(null)
    window.scrollTo({ top: 0, behavior: 'auto' })
    window.requestAnimationFrame(() => floatUpRef.current?.replay())
    setNotice({ key: 'replaying' })
  }

  const runAutoLayout = () => {
    const next = makeLayout(assets)
    setConfig(next)
    setAutoConfig(next)
    setSelectedId(null)
    setNotice({ key: 'autoLayout' })
  }

  const restoreDemo = () => {
    const demoAssets = createDemoAssets()
    replaceWithAssets(demoAssets)
    setNotice({ key: 'demoRestored' })
  }

  const updateSelected = (updater: (item: FloatUpItem) => FloatUpItem) => {
    if (!selectedId) return
    setConfig((current) => ({
      ...current,
      items: current.items.map((item) => item.id === selectedId ? updater(item) : item),
    }))
  }

  const resizeSelected = (nextWidth: number) => {
    if (!selectedId) return
    const image = metadata.get(selectedId)
    updateSelected((item) => {
      const width = Math.min(0.25, Math.max(0.04, nextWidth))
      const height = image
        ? width * (image.height / image.width) * (window.innerWidth / window.innerHeight)
        : width
      return {
        ...item,
        width,
        target: {
          x: Math.min(1 - width / 2, Math.max(width / 2, item.target.x)),
          y: Math.min(1 - height / 2, Math.max(height / 2, item.target.y)),
        },
      }
    })
  }

  const deleteItem = (id: string) => {
    const removedAsset = assets.find((asset) => asset.metadata.id === id)
    if (removedAsset?.objectUrl) URL.revokeObjectURL(removedAsset.objectUrl)
    setAssets((current) => current.filter((asset) => asset.metadata.id !== id))
    setConfig((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }))
    setAutoConfig((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }))
    setSelectedId((current) => current === id ? null : current)
    setNotice({ key: 'removed' })
  }

  const resetSelected = () => {
    if (!selectedId) return
    const automatic = autoConfig.items.find((item) => item.id === selectedId)
    if (!automatic) return
    updateSelected(() => ({ ...automatic, target: { ...automatic.target } }))
    setNotice({ key: 'reset' })
  }

  const getExportConfig = (): FloatUpConfig => ({
    ...config,
    reservedArea: { ...config.reservedArea },
    items: config.items.map((item) => ({
      ...item,
      src: assets.find((asset) => asset.metadata.id === item.id)?.exportSrc ?? item.src,
      target: { ...item.target },
    })),
  })

  const copyConfig = async () => {
    const exported = getExportConfig()
    const centerHeading = locale === 'zh' ? '你的中央内容' : 'Your central content'
    const code = `import { FloatUp, type FloatUpConfig } from './float-up'\nimport './float-up/float-up.css'\n\nconst config: FloatUpConfig = ${JSON.stringify(exported, null, 2)}\n\nexport function Hero() {\n  return (\n    <FloatUp config={config}>\n      <h1>${centerHeading}</h1>\n    </FloatUp>\n  )\n}\n`
    await copyText(code)
    setNotice({ key: 'copied' })
  }

  const downloadConfig = () => {
    const blob = new Blob([JSON.stringify(getExportConfig(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'float-up-layout.json'
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice({ key: 'downloaded' })
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
        <a className="toolbar-brand" href="https://github.com/SaiSai-me/float-up" aria-label={copy.githubLabel}>
          <span>↑</span>
          Float Up
        </a>
        <div className="language-tabs" role="tablist" aria-label={copy.languageLabel}>
          <button
            type="button"
            role="tab"
            aria-selected={locale === 'zh'}
            className={locale === 'zh' ? 'is-active' : ''}
            onClick={() => setLocale('zh')}
          >
            中文
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={locale === 'en'}
            className={locale === 'en' ? 'is-active' : ''}
            onClick={() => setLocale('en')}
          >
            EN
          </button>
        </div>
        <p className="toolbar-status" role="status">{formatNotice(locale, notice)}</p>
        <div className="toolbar-actions">
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="image/png,image/webp,.png,.webp"
            multiple
            onChange={onFileChange}
          />
          <button className="button button-primary" type="button" disabled={isProcessing} onClick={() => fileInputRef.current?.click()}>
            {isProcessing ? copy.toolbar.checking : copy.toolbar.addImages}
          </button>
          <button className="button" type="button" onClick={runAutoLayout} disabled={assets.length === 0}>{copy.toolbar.autoArrange}</button>
          <button
            className={`button${editing ? ' is-active' : ''}`}
            type="button"
            aria-pressed={editing}
            onClick={() => {
              setEditing((current) => !current)
              setSelectedId(null)
            }}
            disabled={assets.length === 0}
          >
            {editing ? copy.toolbar.doneEditing : copy.toolbar.editLayout}
          </button>
          <button className="button" type="button" onClick={replay} disabled={assets.length === 0}>{copy.toolbar.replay}</button>
          <button className="button" type="button" onClick={() => void copyConfig()} disabled={assets.length === 0}>{copy.toolbar.copyReact}</button>
          <button className="button" type="button" onClick={downloadConfig} disabled={assets.length === 0}>{copy.toolbar.downloadJson}</button>
        </div>
      </header>

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
          {editing ? (
            <EditorStage
              config={config}
              metadata={metadata}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChange={setConfig}
              onDelete={deleteItem}
              labels={copy.editor}
            >
              <CenterCard editing copy={copy.center} />
            </EditorStage>
          ) : (
            <FloatUp ref={floatUpRef} config={config}>
              <CenterCard editing={false} copy={copy.center} />
            </FloatUp>
          )}

          {editing && (
            <aside className="editor-inspector" aria-label={copy.editor.ariaLabel}>
              <div className="inspector-heading">
                <div>
                  <span>{copy.editor.heading}</span>
                  <strong>{selectedItem?.id ?? copy.editor.select}</strong>
                </div>
                <button type="button" onClick={() => setEditing(false)} aria-label={copy.editor.close}>×</button>
              </div>
              {selectedItem ? (
                <>
                  <label>
                    <span>{copy.editor.size} <output>{Math.round(selectedItem.width * 100)}%</output></span>
                    <input
                      type="range"
                      min="4"
                      max="25"
                      step="0.5"
                      value={selectedItem.width * 100}
                      onChange={(event) => resizeSelected(Number(event.target.value) / 100)}
                    />
                  </label>
                  <label>
                    <span>{copy.editor.rotation} <output>{Math.round(selectedItem.rotation)}°</output></span>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      step="1"
                      value={selectedItem.rotation}
                      onChange={(event) => updateSelected((item) => ({ ...item, rotation: Number(event.target.value) }))}
                    />
                  </label>
                  <div className="inspector-position">
                    <span>X {Math.round(selectedItem.target.x * 100)}%</span>
                    <span>Y {Math.round(selectedItem.target.y * 100)}%</span>
                  </div>
                  <button className="inspector-button" type="button" onClick={resetSelected}>{copy.editor.reset}</button>
                  <button className="inspector-button is-danger" type="button" onClick={() => deleteItem(selectedItem.id)}>{copy.editor.delete}</button>
                </>
              ) : (
                <p className="inspector-help">{copy.editor.help}</p>
              )}
              <button className="inspector-demo" type="button" onClick={restoreDemo}>{copy.editor.restoreDemo}</button>
            </aside>
          )}

          <div className="scroll-cue" aria-hidden={editing}>
            <span>{copy.scrollCue}</span>
            <i>↓</i>
          </div>
        </div>
      </section>

      <section className="project-notes" aria-labelledby="how-it-works">
        <div className="notes-intro">
          <span>{copy.notes.eyebrow}</span>
          <h2 id="how-it-works">{copy.notes.title}</h2>
          <p>{copy.notes.description}</p>
        </div>
        <div className="notes-grid">
          {copy.notes.cards.map((card, index) => (
            <article key={card.title}>
              <b>{String(index + 1).padStart(2, '0')}</b>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
        <div className="notes-footer">
          <button type="button" onClick={restoreDemo}>{copy.notes.restoreDemo}</button>
          <a href="https://github.com/SaiSai-me/float-up">{copy.notes.viewGithub}</a>
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
    </main>
  )
}
