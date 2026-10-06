import { useEffect, useRef } from 'react'
import { FloatUp, type FloatUpConfig, type FloatUpController } from '../float-up'
import { messages, type Locale } from './i18n'

type ExportDialogCopy = (typeof messages)[Locale]['exportDialog']

type ExportDialogProps = {
  config: FloatUpConfig
  copy: ExportDialogCopy
  isProcessing: boolean
  failed: boolean
  onClose: () => void
  onDownload: () => void
}

export function ExportDialog({ config, copy, isProcessing, failed, onClose, onDownload }: ExportDialogProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const previewRef = useRef<FloatUpController>(null)

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const frame = window.requestAnimationFrame(() => {
      closeRef.current?.focus()
      previewRef.current?.replay()
    })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const buttons = Array.from(dialogRef.current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
      if (buttons.length === 0) return
      if (event.shiftKey && document.activeElement === buttons[0]) {
        event.preventDefault()
        buttons[buttons.length - 1].focus()
      } else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) {
        event.preventDefault()
        buttons[0].focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [onClose])

  return (
    <div className="export-dialog-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className="export-dialog" role="dialog" aria-modal="true" aria-labelledby="export-dialog-title" aria-describedby="export-dialog-description">
        <header className="export-dialog-header">
          <div>
            <span>{copy.eyebrow}</span>
            <h2 id="export-dialog-title">{copy.title}</h2>
            <p id="export-dialog-description">{copy.description}</p>
          </div>
          <button ref={closeRef} className="export-dialog-close" type="button" onClick={onClose} aria-label={copy.close}>×</button>
        </header>

        <div className="export-dialog-body">
          <section className="export-preview-panel" aria-label={copy.previewTitle}>
            <div className="export-preview-heading">
              <div><strong>{copy.previewTitle}</strong><span>{copy.elementCount(config.items.length)} · {copy.transparent}</span></div>
              <button type="button" onClick={() => previewRef.current?.replay()}>↻ {copy.replay}</button>
            </div>
            <div className="export-preview-stage">
              <FloatUp ref={previewRef} config={config} scroll={false} className="export-preview-animation" />
            </div>
          </section>

          <section className="export-package-info" aria-label={copy.formatTitle}>
            <h3>{copy.formatTitle}</h3>
            <p>{copy.formatDescription}</p>
            <dl>
              <div><dt><code>float-up.js</code></dt><dd>{copy.runtime}</dd></div>
              <div><dt><code>float-up-layout.json</code></dt><dd>{copy.layout}</dd></div>
              <div><dt><code>ornaments/</code></dt><dd>{copy.ornaments}</dd></div>
              <div><dt><code>README.md</code></dt><dd>{copy.readme}</dd></div>
              <div><dt><code>AGENTS.md</code></dt><dd>{copy.agents}</dd></div>
              <div><dt><code>LICENSE.txt</code></dt><dd>{copy.license}</dd></div>
            </dl>
          </section>
        </div>

        <footer className="export-dialog-footer">
          <p>{failed ? copy.error : copy.local}</p>
          <button type="button" disabled={isProcessing || config.items.length === 0} onClick={onDownload}>
            {isProcessing ? copy.creating : copy.download}
          </button>
        </footer>
      </section>
    </div>
  )
}
