# Float Up

Turn transparent images into a calm, scroll-linked floating composition for React.

**[Open the live playground](https://saisai-me.github.io/float-up/)** · [中文说明](#中文说明)

Float Up recreates the upward ornament motion from Tanzengsai's personal homepage as a small, reusable open-source component. Every image starts below the viewport under its final horizontal position, rises with one shared ease-out curve, turns softly in mid-flight, and settles around a reserved content area.

## What you can do

- Drop multiple transparent PNG or WebP files into the browser.
- Keep image processing private: files never leave your device.
- Generate a deterministic layout that avoids a central content area.
- Drag, resize, rotate, reset, and remove ornaments in the editor.
- Preview with scroll or the 2.8 second Replay action.
- Copy typed React configuration or download `float-up-layout.json`.
- Respect `prefers-reduced-motion` automatically.

## 30-second quick start

This first release is source-distributed and is not published to npm.

1. Copy [`src/float-up`](src/float-up) into your React + TypeScript project.
2. Copy your transparent files into `public/ornaments/`.
3. Use the playground to arrange them and click **Copy React**.
4. Paste the generated configuration into your page.

```tsx
import { useRef } from 'react'
import {
  FloatUp,
  type FloatUpConfig,
  type FloatUpController,
} from './float-up'
import './float-up/float-up.css'

const config: FloatUpConfig = {
  version: 1,
  reservedArea: { x: 0.27, y: 0.25, width: 0.46, height: 0.5 },
  items: [
    {
      id: 'star',
      src: '/ornaments/star.png',
      target: { x: 0.12, y: 0.18 },
      width: 0.1,
      rotation: -8,
      spin: 14,
    },
  ],
}

export function Hero() {
  const floatUp = useRef<FloatUpController>(null)

  return (
    <div style={{ height: '100vh' }}>
      <FloatUp ref={floatUp} config={config}>
        <h1>Your central content</h1>
      </FloatUp>
      <button onClick={() => floatUp.current?.replay()}>Replay</button>
    </div>
  )
}
```

The stage fills its parent, so give the parent an explicit height. By default, scroll progress is read from the window over `1.15` viewport heights starting at page offset `0`.

## Public API

### `<FloatUp />`

```ts
type FloatUpProps = {
  config: FloatUpConfig
  scroll?: false | {
    startOffsetPx?: number
    distanceVh?: number
  }
  className?: string
  children?: React.ReactNode
}
```

- `config` contains the reserved area and every ornament's source, endpoint, size, final rotation, and mid-flight spin.
- `scroll={false}` displays the settled state until Replay is called.
- `scroll.startOffsetPx` sets the document scroll position where the rise begins.
- `scroll.distanceVh` sets how many viewport heights complete the rise.
- `children` renders inside the reserved central area.
- The forwarded `FloatUpController` exposes `replay()`.

### `createFloatUpLayout()`

```ts
createFloatUpLayout(metadata, {
  reservedArea,
  stageAspectRatio: 16 / 9,
})
```

The layout function normalizes visual size from each file's visible-alpha bounds, places items along the top and side arcs, moves them outside the reserved rectangle, then runs a deterministic one-time collision pass. No collision work happens during animation.

### Configuration coordinates

- `target.x` and `target.y` are normalized image-center coordinates from `0` to `1`.
- `width` is the rendered width divided by the stage width.
- `rotation` and `spin` use degrees.
- `reservedArea` uses normalized top-left coordinates plus normalized width and height.
- Exported configuration uses `version: 1` so future readers can migrate formats safely.

## Image guidelines

- Supported in the playground: static PNG and WebP.
- Files must contain at least one transparent pixel and at least one visible pixel.
- Leave a little transparent padding around the subject, but avoid extremely large empty margins.
- Use clear filenames; the exporter converts them into safe paths under `/ornaments/`.
- SVG, GIF, Lottie, video, and remote image URLs are intentionally outside v1.

## Motion and accessibility

Float Up uses one passive scroll listener and one shared `requestAnimationFrame` loop. Per-frame work changes only image transforms. A `ResizeObserver` keeps normalized endpoints stable as the desktop stage changes size.

Decorative images are hidden from assistive technology by default. Add `alt` to an item when it communicates content. When the operating system requests reduced motion, Float Up skips the rise and displays the final layout.

The editor also supports keyboard movement: select an ornament, use the arrow keys for 0.5% steps, hold Shift for 2% steps, and press Delete or Backspace to remove it.

## Privacy

The live playground has no upload API, database, analytics pipeline, or browser persistence for user images. Files are decoded into local Object URLs and released when replaced, removed, or when the playground closes. Refreshing clears the session.

## Project structure

```text
src/float-up/     reusable component, types, layout engine, and base CSS
src/playground/   local upload, editor, preview, and export UI
public/demo/      original MIT-licensed transparent sample ornaments
```

## Development

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

The project targets desktop layouts with a 960px minimum stage width. Pull requests run type checking and a production build. Updates to `main` deploy the built `dist` folder to GitHub Pages.

## Contributing

Small, focused fixes are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Please do not add personal, trademarked, or ambiguously licensed demo assets.

## License and sample assets

Code and the files in `public/demo/` are released under the [MIT License](LICENSE). The neutral demo ornaments and social preview were created specifically for Float Up with OpenAI image generation tools and are included as project assets under the same license.

---

## 中文说明

Float Up 把透明图片变成一组从页面底部平静上浮、轻微旋转并落在中央内容四周的装饰元素。

第一版提供 React + TypeScript 源码和在线编辑器，不发布 npm 包。你可以直接上传多张透明 PNG/WebP，自动排版后拖动落点、缩放和旋转，再复制 React 配置或下载 `float-up-layout.json`。图片只在浏览器本地处理，不会上传到服务器。

快速使用：

1. 打开[在线演示](https://saisai-me.github.io/float-up/)。
2. 上传透明图片并点击 **Edit layout** 调整。
3. 把原图放到自己项目的 `public/ornaments/`。
4. 点击 **Copy React**，并把 `src/float-up/` 复制到自己的 React 项目。

当前仅面向桌面网页，支持静态 PNG/WebP；移动端、Lottie、SVG、GIF、视频导出和 npm 发布不属于 v1 范围。
