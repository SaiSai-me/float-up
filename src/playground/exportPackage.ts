import { strToU8, zipSync, type Zippable } from 'fflate'
import type { FloatUpConfig } from '../float-up'
import type { PlaygroundAsset } from './imageFiles'

const RUNTIME_LICENSE = `MIT License

Copyright (c) 2026 Tanzengsai

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`

const RUNTIME = String.raw`(() => {
  'use strict'
  const tagName = __FLOAT_UP_TAG__
  const config = __FLOAT_UP_CONFIG__
  const images = __FLOAT_UP_IMAGES__
  const defaultMotion = config.motion || { durationMs: 2800, easing: { x1: .22, y1: 1, x2: .36, y2: 1 } }
  const clamp = (value) => Math.max(0, Math.min(1, value))
  const cubic = (t, p1, p2) => 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3
  function easing(progress, curve) {
    if (progress <= 0) return 0
    if (progress >= 1) return 1
    let lower = 0
    let upper = 1
    for (let i = 0; i < 24; i += 1) {
      const t = (lower + upper) / 2
      const x = cubic(t, curve.x1, curve.x2)
      if (x < progress) lower = t
      else upper = t
    }
    return cubic((lower + upper) / 2, clamp(curve.y1), clamp(curve.y2))
  }

  function entryOffset(x, y, width, height, margin, directionDeg) {
    const radians = directionDeg * Math.PI / 180
    const dx = Math.cos(radians)
    const dy = Math.sin(radians)
    const distance = Math.min(
      dx > 0.0001 ? (x + margin) / dx : Infinity,
      dx < -0.0001 ? (width - x + margin) / -dx : Infinity,
      dy > 0.0001 ? (y + margin) / dy : Infinity,
      dy < -0.0001 ? (height - y + margin) / -dy : Infinity,
    )
    return { x: -dx * distance, y: -dy * distance }
  }

  if (customElements.get(tagName)) return

  class FloatUpScene extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: 'open' })
      this.frame = null
      this.replayStart = null
      this.hold = false
      this.onScroll = () => {
        this.replayStart = null
        this.hold = false
        this.requestUpdate()
      }
      this.onMotionChange = () => this.requestUpdate()
      this.requestUpdate = () => {
        if (this.frame === null) this.frame = requestAnimationFrame(() => this.update())
      }
    }

    connectedCallback() {
      const style = document.createElement('style')
      style.textContent = ':host{display:block;position:relative;width:100%;height:100vh;overflow:hidden;background:transparent} .stage{position:relative;width:100%;height:100%;overflow:hidden;isolation:isolate;background:transparent} .items{position:absolute;inset:0;pointer-events:none} img{position:absolute;display:block;height:auto;object-fit:contain;user-select:none;filter:drop-shadow(0 20px 24px rgba(73,67,58,.14));will-change:transform} .content{position:absolute;display:grid;place-items:center;z-index:1;pointer-events:none} .content slot{pointer-events:auto} @media(prefers-reduced-motion:reduce){img{will-change:auto}}'
      const stage = document.createElement('div')
      stage.className = 'stage'
      const layer = document.createElement('div')
      layer.className = 'items'
      this.itemElements = config.items.map((item) => {
        const img = document.createElement('img')
        img.src = images[item.src]
        img.alt = item.alt || ''
        img.draggable = false
        img.style.left = item.target.x * 100 + '%'
        img.style.top = item.target.y * 100 + '%'
        img.style.width = item.width * 100 + '%'
        img.addEventListener('load', this.requestUpdate)
        layer.appendChild(img)
        return img
      })
      const content = document.createElement('div')
      content.className = 'content'
      content.style.left = config.reservedArea.x * 100 + '%'
      content.style.top = config.reservedArea.y * 100 + '%'
      content.style.width = config.reservedArea.width * 100 + '%'
      content.style.height = config.reservedArea.height * 100 + '%'
      const slot = document.createElement('slot')
      slot.name = 'content'
      content.appendChild(slot)
      stage.append(layer, content)
      this.shadowRoot.replaceChildren(style, stage)
      this.stage = stage
      this.media = matchMedia('(prefers-reduced-motion: reduce)')
      this.media.addEventListener('change', this.onMotionChange)
      this.observer = new ResizeObserver(this.requestUpdate)
      this.observer.observe(stage)
      window.addEventListener('scroll', this.onScroll, { passive: true })
      this.requestUpdate()
    }

    disconnectedCallback() {
      window.removeEventListener('scroll', this.onScroll)
      this.media?.removeEventListener('change', this.onMotionChange)
      this.observer?.disconnect()
      this.itemElements?.forEach((img) => img.removeEventListener('load', this.requestUpdate))
      if (this.frame !== null) cancelAnimationFrame(this.frame)
      this.frame = null
    }

    replay() {
      this.hold = false
      this.replayStart = performance.now()
      this.requestUpdate()
    }

    update() {
      this.frame = null
      if (!this.stage) return
      const now = performance.now()
      const elapsed = this.replayStart === null ? null : now - this.replayStart
      const maxDuration = config.items.length
        ? Math.max(...config.items.map((item) => (item.motion || defaultMotion).durationMs))
        : defaultMotion.durationMs
      const anchor = getComputedStyle(this).position === 'sticky' ? this.parentElement || this : this
      const start = anchor.getBoundingClientRect().top + window.scrollY
      const scrollProgress = clamp((window.scrollY - start) / Math.max(1, window.innerHeight * 1.15))
      const width = this.stage.clientWidth
      const height = this.stage.clientHeight

      config.items.forEach((item, index) => {
        const img = this.itemElements[index]
        const motion = item.motion || defaultMotion
        const source = this.media.matches || this.hold ? 1 : elapsed === null
          ? clamp(scrollProgress * maxDuration / Math.max(1, motion.durationMs))
          : clamp(elapsed / Math.max(1, motion.durationMs))
        const progress = easing(source, motion.easing)
        const margin = Math.max(img.clientWidth, img.clientHeight) / 2 + 56
        const directionDeg = item.motion?.directionDeg ?? 270
        const entry = entryOffset(
          item.target.x * width, item.target.y * height, width, height,
          margin, directionDeg,
        )
        const exit = item.exitMode === 'fly-out' && !this.media.matches
          ? entryOffset(item.target.x * width, item.target.y * height, width, height, margin, directionDeg + 180)
          : { x: 0, y: 0 }
        const x = entry.x * (1 - progress) + exit.x * progress
        const y = entry.y * (1 - progress) + exit.y * progress
        img.style.transform = 'translate3d(calc(-50% + ' + x + 'px), calc(-50% + ' + y + 'px), 0) rotate(' + item.rotation + 'deg)'
      })

      if (elapsed !== null && elapsed < maxDuration && !this.media.matches) this.requestUpdate()
      else if (elapsed !== null) {
        this.replayStart = null
        this.hold = true
      }
    }
  }

  customElements.define(tagName, FloatUpScene)
})()
`

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Failed to encode image'))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image'))
    reader.readAsDataURL(blob)
  })
}

function createReadme(tagName: string) {
  return `# Float Up website package / 网页动效包

This package contains your edited transparent ornament scene. The runtime has no React dependency, no background, and embeds its images in one JavaScript file.

## Install / 接入

1. Copy \`float-up.js\` into your website's public files, for example \`public/float-up.js\`.
2. Add this to the page:

\`\`\`html
<script src="/float-up.js" defer></script>
<section style="height: 215vh; position: relative;">
  <${tagName} style="position: sticky; top: 0; height: 100vh;"></${tagName}>
</section>
\`\`\`

The ornaments move as the page scrolls through the section. Each item either stops at its edited position or passes through it and leaves the stage, according to \`exitMode\`. The item's \`durationMs\` covers its whole flight. To start the complete animation without scrolling, call \`document.querySelector('${tagName}').replay()\`. To place your own content in the reserved area, add a child with \`slot="content"\`.

The cubic Bézier curve changes only the speed along one path. Its control points stay within 0–1, so the image never passes an endpoint and moves back because of the curve.

仅需复制 \`float-up.js\` 即可在网页中使用；图片已经内嵌。组件背景透明，不会覆盖网页背景。滚动页面时播放各元素的自定义动效：元素可停在设定位置，也可经过该位置后飞出画布；也可调用 \`replay()\` 主动播放。

## Files / 文件

- \`float-up.js\`: standalone web component and embedded images; this is the only file required on the website.
- \`float-up-layout.json\`: editable motion, layout, and image path data.
- \`ornaments/\`: images for future editing or Agent handoff. Formats outside the common web image set are converted to PNG during import.
- \`AGENTS.md\`: instructions for coding agents.
- \`LICENSE.txt\`: MIT license for the generated runtime. Your own image rights remain yours.

The SVG illustrations on the Float Up introduction page are not included. This package contains only the images in your edited scene.
`
}

function createAgentGuide(tagName: string) {
  return `# Float Up scene handoff

This is a user-created transparent animation scene. Integrate it into a website without changing the visual design unless asked.

- Production entry: \`float-up.js\`, a dependency-free custom element named \`<${tagName}>\`. Images are embedded; do not upload \`ornaments/\` unless the user wants separate files.
- Use the exact HTML snippet in \`README.md\`. The host element is transparent and needs an explicit height. A tall wrapper with a sticky host gives the scroll animation room to finish.
- \`float-up-layout.json\` is the machine-readable source of positions, sizes, rotations, per-item direction, duration, cubic Bézier speed curve, and \`exitMode\`. \`stop\` ends at \`target\`; \`fly-out\` passes through \`target\` and continues offstage along \`directionDeg\`. Curve control points stay within 0–1, so speed editing cannot reverse the path. The imported images are in \`ornaments/\`; uncommon formats are converted to PNG.
- For non-scroll playback, call the element's \`replay()\` method. The runtime respects \`prefers-reduced-motion\`.
- If an edit to the motion or artwork is needed, re-import this ZIP into Float Up and export again. The generated JS includes base64 images and is not the best place to hand-edit parameters.
- Keep the widget background transparent. Do not add a container background unless the user requests one.
`
}

export async function buildWebsitePackage(config: FloatUpConfig, assets: PlaygroundAsset[]) {
  const files: Zippable = {}
  const images: Record<string, string> = {}
  const assetsById = new Map(assets.map((asset) => [asset.metadata.id, asset]))

  for (const item of config.items) {
    const asset = assetsById.get(item.id)
    if (!asset) throw new Error(`Missing image for ${item.id}`)
    const response = await fetch(asset.metadata.src)
    if (!response.ok) throw new Error(`Unable to read ${asset.fileName}`)
    const blob = await response.blob()
    images[item.src] = await blobToDataUrl(blob)
    files[`ornaments/${asset.fileName}`] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }]
  }

  const tagName = `float-up-scene-${Math.random().toString(36).slice(2, 10)}`
  const runtime = RUNTIME
    .replace('__FLOAT_UP_TAG__', JSON.stringify(tagName))
    .replace('__FLOAT_UP_CONFIG__', JSON.stringify(config, null, 2))
    .replace('__FLOAT_UP_IMAGES__', JSON.stringify(images))
  files['float-up.js'] = strToU8(`/*\n${RUNTIME_LICENSE}\n*/\n${runtime}`)
  files['float-up-layout.json'] = strToU8(JSON.stringify(config, null, 2))
  files['README.md'] = strToU8(createReadme(tagName))
  files['AGENTS.md'] = strToU8(createAgentGuide(tagName))
  files['LICENSE.txt'] = strToU8(RUNTIME_LICENSE)

  const archive = zipSync(files, { level: 1 })
  return new Blob([archive], { type: 'application/zip' })
}
