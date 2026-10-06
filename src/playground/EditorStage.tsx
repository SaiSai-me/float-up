import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { FloatUpConfig, FloatUpImageMetadata, FloatUpItem } from '../float-up'
import { getEntryOffset } from '../float-up/entry'

type PointerAction = {
  kind: 'move' | 'resize' | 'rotate' | 'direction'
  item: FloatUpItem
  startX: number
  startY: number
  startDistance: number
  startAngle: number
}

type EditorStageProps = {
  config: FloatUpConfig
  metadata: Map<string, FloatUpImageMetadata>
  selectedId: string | null
  previewingId: string | null
  onSelect: (id: string | null) => void
  onChange: (config: FloatUpConfig) => void
  onDelete: (id: string) => void
  onReorder: (id: string, direction: -1 | 1) => void
  labels: {
    editItem: (id: string) => string
    resizeItem: (id: string) => string
    rotateItem: (id: string) => string
    directionItem: (id: string) => string
    sendBackward: string
    bringForward: string
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function EditorStage({
  config,
  metadata,
  selectedId,
  previewingId,
  onSelect,
  onChange,
  onDelete,
  onReorder,
  labels,
}: EditorStageProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const actionRef = useRef<PointerAction | null>(null)
  const configRef = useRef(config)
  configRef.current = config
  const selectedItem = config.items.find((item) => item.id === selectedId)
  const selectedIndex = config.items.findIndex((item) => item.id === selectedId)
  const directionDeg = selectedItem?.motion?.directionDeg ?? 270
  const direction = directionDeg * Math.PI / 180
  const selectedImage = selectedItem ? metadata.get(selectedItem.id) : undefined
  const itemWidth = (selectedItem?.width ?? 0) * stageSize.width
  const itemHeight = itemWidth * (selectedImage ? selectedImage.height / selectedImage.width : 1)
  const handleDistance = Math.max(38, Math.hypot(itemWidth, itemHeight) * 0.56)
  const centerX = (selectedItem?.target.x ?? 0) * stageSize.width
  const centerY = (selectedItem?.target.y ?? 0) * stageSize.height
  const handleX = clamp(centerX + Math.cos(direction) * handleDistance, 16, Math.max(16, stageSize.width - 16))
  const handleY = clamp(centerY + Math.sin(direction) * handleDistance, 16, Math.max(16, stageSize.height - 16))
  const guideLength = Math.hypot(handleX - centerX, handleY - centerY)
  const guideEndRatio = guideLength > 0 ? 1 - Math.min(20, guideLength * 0.3) / guideLength : 0
  const exitGuide = selectedItem?.exitMode === 'fly-out'
    ? getEntryOffset(centerX, centerY, stageSize.width, stageSize.height, 0, directionDeg + 180)
    : null
  const exitGuideLength = exitGuide ? Math.hypot(exitGuide.x, exitGuide.y) : 0
  const exitGuideRatio = exitGuideLength > 0 ? 1 - Math.min(24, exitGuideLength * 0.25) / exitGuideLength : 0

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const updateSize = () => {
      setStageSize((current) => stage.clientWidth === current.width && stage.clientHeight === current.height
        ? current
        : { width: stage.clientWidth, height: stage.clientHeight })
    }
    const observer = new ResizeObserver(updateSize)
    observer.observe(stage)
    updateSize()
    return () => observer.disconnect()
  }, [])

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
      } else if (action.kind === 'resize') {
        const centerX = bounds.left + action.item.target.x * bounds.width
        const centerY = bounds.top + action.item.target.y * bounds.height
        const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY)
        updateItem(action.item.id, (item) => {
          const image = metadata.get(action.item.id)
          const maxWidth = image
            ? Math.min(0.25, 0.9 * image.width / image.height / (bounds.width / bounds.height))
            : 0.25
          const width = clamp(action.item.width * distance / action.startDistance, Math.min(0.005, maxWidth / 2), maxWidth)
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
      } else {
        const centerX = bounds.left + action.item.target.x * bounds.width
        const centerY = bounds.top + action.item.target.y * bounds.height
        const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI
        if (action.kind === 'rotate') {
          updateItem(action.item.id, (item) => ({
            ...item,
            rotation: Math.round((action.item.rotation + angle - action.startAngle) * 10) / 10,
          }))
        } else {
          const directionDeg = Math.round((angle + 360) % 360)
          updateItem(action.item.id, (item) => ({
            ...item,
            motion: {
              ...(item.motion ?? configRef.current.motion ?? { durationMs: 2800, easing: { x1: 0.2, y1: 0, x2: 0.2, y2: 1 } }),
              directionDeg,
            },
          }))
        }
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
      startDistance: Math.max(1, Math.hypot(
        event.clientX - (stageRef.current?.getBoundingClientRect().left ?? 0) - item.target.x * (stageRef.current?.clientWidth ?? 0),
        event.clientY - (stageRef.current?.getBoundingClientRect().top ?? 0) - item.target.y * (stageRef.current?.clientHeight ?? 0),
      )),
      startAngle: Math.atan2(
        event.clientY - (stageRef.current?.getBoundingClientRect().top ?? 0) - item.target.y * (stageRef.current?.clientHeight ?? 0),
        event.clientX - (stageRef.current?.getBoundingClientRect().left ?? 0) - item.target.x * (stageRef.current?.clientWidth ?? 0),
      ) * 180 / Math.PI,
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
      const image = metadata.get(item.id)
      const stage = stageRef.current
      const height = image && stage
        ? item.width * (image.height / image.width) * (stage.clientWidth / stage.clientHeight)
        : item.width
      updateItem(item.id, (current) => ({
        ...current,
        target: {
          x: clamp(current.target.x + movement.x, current.width / 2, 1 - current.width / 2),
          y: clamp(current.target.y + movement.y, height / 2, 1 - height / 2),
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
      className={`editor-stage${previewingId ? ' is-item-previewing' : ''}`}
      onPointerDown={() => onSelect(null)}
    >
      <div className="editor-stage-grid" aria-hidden="true" />
      {exitGuide && (
        <svg className="editor-exit-guide" viewBox={`0 0 ${stageSize.width} ${stageSize.height}`} aria-hidden="true">
          <defs>
            <marker id="editor-exit-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M1 1 L8 4.5 L1 8 Z" fill="#1c69ff" />
            </marker>
          </defs>
          <line x1={centerX} y1={centerY} x2={centerX + exitGuide.x * exitGuideRatio} y2={centerY + exitGuide.y * exitGuideRatio} markerEnd="url(#editor-exit-arrow)" />
        </svg>
      )}
      {selectedItem && (
        <>
          <svg className="editor-direction-guide" viewBox="0 0 200 200" aria-hidden="true" style={{ left: `${selectedItem.target.x * 100}%`, top: `${selectedItem.target.y * 100}%` }}>
            <defs>
              <marker id="editor-direction-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M1 1 L8 4.5 L1 8 Z" fill="#1c69ff" />
              </marker>
            </defs>
            <line x1="100" y1="100" x2={100 + (handleX - centerX) * guideEndRatio} y2={100 + (handleY - centerY) * guideEndRatio} markerEnd="url(#editor-direction-arrow)" />
          </svg>
          <button
            className="editor-transform-handle editor-direction-handle"
            type="button"
            aria-label={labels.directionItem(selectedItem.id)}
            title={labels.directionItem(selectedItem.id)}
            style={{ left: handleX, top: handleY }}
            onPointerDown={(event) => startAction(event, selectedItem, 'direction')}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ transform: `rotate(${directionDeg + 90}deg)` }}>
              <path d="M12 18V5m0 0-5 5m5-5 5 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}
      {config.items.map((item) => (
        <div
          key={item.id}
          className={`editor-item${selectedId === item.id ? ' is-selected' : ''}`}
          role="button"
          tabIndex={0}
          aria-label={labels.editItem(item.id)}
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
            <>
              <button className="editor-transform-handle editor-rotate-handle" type="button" aria-label={labels.rotateItem(item.id)} title={labels.rotateItem(item.id)} onPointerDown={(event) => startAction(event, item, 'rotate')}>↻</button>
              <button className="editor-transform-handle editor-resize-handle" type="button" aria-label={labels.resizeItem(item.id)} title={labels.resizeItem(item.id)} onPointerDown={(event) => startAction(event, item, 'resize')}>⤡</button>
            </>
          )}
        </div>
      ))}
      {selectedItem && (
        <div className="editor-context-actions" onPointerDown={(event) => event.stopPropagation()}>
          <span title={selectedItem.id}>{selectedItem.id}</span>
          <button type="button" title={labels.sendBackward} disabled={selectedIndex <= 0} onClick={() => onReorder(selectedItem.id, -1)}>{labels.sendBackward}</button>
          <button type="button" title={labels.bringForward} disabled={selectedIndex >= config.items.length - 1} onClick={() => onReorder(selectedItem.id, 1)}>{labels.bringForward}</button>
        </div>
      )}
    </div>
  )
}
