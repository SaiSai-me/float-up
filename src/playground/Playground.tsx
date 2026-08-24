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
import { getSafeFileStem, inspectImageFile, revokeAssets, type PlaygroundAsset } from './imageFiles'

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

function CenterCard({ editing }: { editing: boolean }) {
  return (
    <article className={`center-card${editing ? ' is-editing' : ''}`}>
      <span className="center-eyebrow">OPEN-SOURCE REACT EFFECT</span>
      <h1>Float Up</h1>
      <p>Upload transparent images. Let them rise, drift, and settle around your content.</p>
      <ol aria-label="Workflow">
        <li><span>1</span> Upload</li>
        <li><span>2</span> Arrange</li>
        <li><span>3</span> Edit</li>
        <li><span>4</span> Export</li>
      </ol>
      {editing && <strong>Reserved content area</strong>}
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
  const [editing, setEditing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const [notice, setNotice] = useState('Try the sample, or add your own transparent images.')
  const floatUpRef = useRef<FloatUpController>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const assetsRef = useRef(assets)
  assetsRef.current = assets

  const metadata = useMemo(
    () => new Map(assets.map((asset) => [asset.metadata.id, asset.metadata])),
    [assets],
  )
  const selectedItem = config.items.find((item) => item.id === selectedId) ?? null

  useEffect(() => () => revokeAssets(assetsRef.current), [])

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
    const nextErrors: string[] = []
    const occurrences = new Map<string, number>()

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      const occurrenceKey = getSafeFileStem(file.name, `ornament-${index + 1}`)
      const occurrence = (occurrences.get(occurrenceKey) ?? 0) + 1
      occurrences.set(occurrenceKey, occurrence)

      try {
        nextAssets.push(await inspectImageFile(file, index, occurrence))
      } catch (error) {
        nextErrors.push(error instanceof Error ? error.message : `${file.name}: unable to inspect this image.`)
      }
    }

    if (nextAssets.length > 0) {
      replaceWithAssets(nextAssets)
      setNotice(`${nextAssets.length} image${nextAssets.length === 1 ? '' : 's'} arranged locally. Nothing was uploaded.`)
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
    setNotice('Replaying the complete 2.8 second rise.')
  }

  const runAutoLayout = () => {
    const next = makeLayout(assets)
    setConfig(next)
    setAutoConfig(next)
    setSelectedId(null)
    setNotice('A fresh deterministic layout has been applied.')
  }

  const restoreDemo = () => {
    const demoAssets = createDemoAssets()
    replaceWithAssets(demoAssets)
    setNotice('The original Float Up demo ornaments are back.')
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
    setNotice('Ornament removed from this layout.')
  }

  const resetSelected = () => {
    if (!selectedId) return
    const automatic = autoConfig.items.find((item) => item.id === selectedId)
    if (!automatic) return
    updateSelected(() => ({ ...automatic, target: { ...automatic.target } }))
    setNotice('This ornament has returned to its automatic position.')
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
    const code = `import { FloatUp, type FloatUpConfig } from './float-up'\nimport './float-up/float-up.css'\n\nconst config: FloatUpConfig = ${JSON.stringify(exported, null, 2)}\n\nexport function Hero() {\n  return (\n    <FloatUp config={config}>\n      <h1>Your central content</h1>\n    </FloatUp>\n  )\n}\n`
    await copyText(code)
    setNotice('React config copied. Add the matching files to public/ornaments/.')
  }

  const downloadConfig = () => {
    const blob = new Blob([JSON.stringify(getExportConfig(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'float-up-layout.json'
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('float-up-layout.json downloaded.')
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
        <a className="toolbar-brand" href="https://github.com/SaiSai-me/float-up" aria-label="Float Up on GitHub">
          <span>↑</span>
          Float Up
        </a>
        <p className="toolbar-status" role="status">{notice}</p>
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
            {isProcessing ? 'Checking…' : '+ Add images'}
          </button>
          <button className="button" type="button" onClick={runAutoLayout} disabled={assets.length === 0}>Auto arrange</button>
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
            {editing ? 'Done editing' : 'Edit layout'}
          </button>
          <button className="button" type="button" onClick={replay} disabled={assets.length === 0}>↻ Replay</button>
          <button className="button" type="button" onClick={() => void copyConfig()} disabled={assets.length === 0}>Copy React</button>
          <button className="button" type="button" onClick={downloadConfig} disabled={assets.length === 0}>Download JSON</button>
        </div>
      </header>

      {errors.length > 0 && (
        <aside className="error-panel" aria-live="polite">
          <div>
            <strong>Some images were skipped</strong>
            {errors.map((error) => <p key={error}>{error}</p>)}
          </div>
          <button type="button" onClick={() => setErrors([])} aria-label="Dismiss errors">×</button>
        </aside>
      )}

      <section className="playground-track" aria-label="Float Up playground">
        <div className="playground-sticky-stage">
          {editing ? (
            <EditorStage
              config={config}
              metadata={metadata}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChange={setConfig}
              onDelete={deleteItem}
            >
              <CenterCard editing />
            </EditorStage>
          ) : (
            <FloatUp ref={floatUpRef} config={config}>
              <CenterCard editing={false} />
            </FloatUp>
          )}

          {editing && (
            <aside className="editor-inspector" aria-label="Layout editor">
              <div className="inspector-heading">
                <div>
                  <span>LAYOUT EDITOR</span>
                  <strong>{selectedItem?.id ?? 'Select an ornament'}</strong>
                </div>
                <button type="button" onClick={() => setEditing(false)} aria-label="Close editor">×</button>
              </div>
              {selectedItem ? (
                <>
                  <label>
                    <span>Size <output>{Math.round(selectedItem.width * 100)}%</output></span>
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
                    <span>Rotation <output>{Math.round(selectedItem.rotation)}°</output></span>
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
                  <button className="inspector-button" type="button" onClick={resetSelected}>Reset this item</button>
                  <button className="inspector-button is-danger" type="button" onClick={() => deleteItem(selectedItem.id)}>Delete item</button>
                </>
              ) : (
                <p className="inspector-help">Drag an ornament to move it. Select it to resize, rotate, reset, or delete. Arrow keys move by 0.5%; hold Shift for 2%.</p>
              )}
              <button className="inspector-demo" type="button" onClick={restoreDemo}>Restore demo ornaments</button>
            </aside>
          )}

          <div className="scroll-cue" aria-hidden={editing}>
            <span>SCROLL TO FLOAT</span>
            <i>↓</i>
          </div>
        </div>
      </section>

      <section className="project-notes" aria-labelledby="how-it-works">
        <div className="notes-intro">
          <span>ONE MOTION, YOUR IMAGES</span>
          <h2 id="how-it-works">From transparent files to a reusable React scene.</h2>
          <p>Float Up keeps the runtime deliberately small: one animation loop, transform-only motion, deterministic layout, and no uploads.</p>
        </div>
        <div className="notes-grid">
          <article>
            <b>01</b>
            <h3>Private by default</h3>
            <p>PNG and WebP files are decoded, checked, and arranged entirely inside your browser.</p>
          </article>
          <article>
            <b>02</b>
            <h3>Calm motion</h3>
            <p>Every object rises under its final X position, with a shared ease-out and a soft mid-flight turn.</p>
          </article>
          <article>
            <b>03</b>
            <h3>Copy the source</h3>
            <p>Export versioned JSON or copy typed React configuration, then bring the small component folder into your project.</p>
          </article>
        </div>
        <div className="notes-footer">
          <button type="button" onClick={restoreDemo}>Restore demo</button>
          <a href="https://github.com/SaiSai-me/float-up">View source on GitHub ↗</a>
        </div>
      </section>

      {isDraggingFiles && (
        <div className="drop-overlay" aria-hidden="true">
          <div>
            <span>＋</span>
            <strong>Drop transparent images</strong>
            <p>PNG or WebP · processed locally</p>
          </div>
        </div>
      )}
    </main>
  )
}
