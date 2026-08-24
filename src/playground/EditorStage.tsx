import { useEffect, useRef } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import type { FloatUpConfig, FloatUpImageMetadata, FloatUpItem } from '../float-up'

type PointerAction = {
  kind: 'move' | 'resize'
  item: FloatUpItem
  startX: number
  startY: number
}

type EditorStageProps = {
  config: FloatUpConfig
  metadata: Map<string, FloatUpImageMetadata>
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChange: (config: FloatUpConfig) => void
  onDelete: (id: string) => void
  children?: ReactNode
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function EditorStage({
  config,
  metadata,
  selectedId,
  onSelect,
  onChange,
  onDelete,
  children,
}: EditorStageProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const actionRef = useRef<PointerAction | null>(null)
  const configRef = useRef(config)
  configRef.current = config

  const updateItem = (id: string, updater: (item: FloatUpItem) => FloatUpItem) => {
    onChange({
      ...configRef.current,
      items: configRef.current.items.map((item) => item.id === id ? updater(item) : item),
    })
  }

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const action = actionRef.current
      const stage = stageRef.current
      if (!action || !stage) return
      const bounds = stage.getBoundingClientRect()
      const dx = (event.clientX - action.startX) / bounds.width
      const dy = (event.clientY - action.startY) / bounds.height

      if (action.kind === 'move') {
        const image = metadata.get(action.item.id)
        const height = image
          ? action.item.width * (image.height / image.width) * (bounds.width / bounds.height)
          : action.item.width
        updateItem(action.item.id, (item) => ({
          ...item,
          target: {
            x: clamp(action.item.target.x + dx, item.width / 2, 1 - item.width / 2),
            y: clamp(action.item.target.y + dy, height / 2, 1 - height / 2),
          },
        }))
      } else {
        const scaleDelta = Math.max(dx, dy * (bounds.height / bounds.width))
        updateItem(action.item.id, (item) => {
          const width = clamp(action.item.width + scaleDelta * 2, 0.04, 0.25)
          const image = metadata.get(action.item.id)
          const height = image
            ? width * (image.height / image.width) * (bounds.width / bounds.height)
            : width
          return {
            ...item,
            width,
            target: {
              x: clamp(item.target.x, width / 2, 1 - width / 2),
              y: clamp(item.target.y, height / 2, 1 - height / 2),
            },
          }
        })
      }
    }

    const onPointerUp = () => {
      actionRef.current = null
      document.body.classList.remove('is-float-up-dragging')
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [metadata, onChange])

  const startAction = (
    event: ReactPointerEvent,
    item: FloatUpItem,
    kind: PointerAction['kind'],
  ) => {
    event.preventDefault()
    event.stopPropagation()
    onSelect(item.id)
    actionRef.current = {
      kind,
      item: { ...item, target: { ...item.target } },
      startX: event.clientX,
      startY: event.clientY,
    }
    document.body.classList.add('is-float-up-dragging')
  }

  const onItemKeyDown = (event: KeyboardEvent<HTMLDivElement>, item: FloatUpItem) => {
    const step = event.shiftKey ? 0.02 : 0.005
    const movement = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    }[event.key]

    if (movement) {
      event.preventDefault()
      updateItem(item.id, (current) => ({
        ...current,
        target: {
          x: clamp(current.target.x + movement.x, current.width / 2, 1 - current.width / 2),
          y: clamp(current.target.y + movement.y, 0.04, 0.96),
        },
      }))
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      onDelete(item.id)
    }
  }

  return (
    <div
      ref={stageRef}
      className="editor-stage"
      onPointerDown={() => onSelect(null)}
    >
      <div className="editor-stage-grid" aria-hidden="true" />
      <div
        className="editor-reserved-area"
        style={{
          left: `${config.reservedArea.x * 100}%`,
          top: `${config.reservedArea.y * 100}%`,
          width: `${config.reservedArea.width * 100}%`,
          height: `${config.reservedArea.height * 100}%`,
        }}
      >
        {children}
      </div>
      {config.items.map((item) => (
        <div
          key={item.id}
          className={`editor-item${selectedId === item.id ? ' is-selected' : ''}`}
          role="button"
          tabIndex={0}
          aria-label={`Edit ${item.id}. Use arrow keys to move and Delete to remove.`}
          onPointerDown={(event) => startAction(event, item, 'move')}
          onKeyDown={(event) => onItemKeyDown(event, item)}
          style={{
            left: `${item.target.x * 100}%`,
            top: `${item.target.y * 100}%`,
            width: `${item.width * 100}%`,
            transform: `translate3d(-50%, -50%, 0) rotate(${item.rotation}deg)`,
          } as CSSProperties}
        >
          <img src={item.src} alt="" draggable={false} />
          <span className="editor-item-outline" aria-hidden="true" />
          {selectedId === item.id && (
            <button
              className="editor-resize-handle"
              type="button"
              aria-label={`Resize ${item.id}`}
              onPointerDown={(event) => startAction(event, item, 'resize')}
            />
          )}
        </div>
      ))}
    </div>
  )
}
