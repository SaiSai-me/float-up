# Float Up

Visually compose transparent motion, then export a website-ready package.

**[Open the live playground](https://saisai-me.github.io/float-up/)** · [中文说明](#中文说明)

Float Up is an open-source visual editor for transparent PNG/WebP motion. Place each image at an anchor point, set its size and rotation, then give it a travel direction, duration, cubic Bézier speed curve, and end behavior. Each element can stop at the anchor or continue offscreen. Preview the full composition before exporting it.

The introduction uses a separate, continuously looping background of transparent 2D illustrations. The editor remains the place to build and export a Float Up composition.

## What you can do

- Drop multiple transparent PNG or WebP files into the browser. Later additions keep the images already in your layout.
- Keep image processing private: files never leave your device.
- Generate a deterministic layout that avoids a central content area.
- Drag, resize, rotate, reset, and remove ornaments in the editor.
- Set each ornament's anchor, direction, size, rotation, travel duration, cubic Bézier speed curve, and whether it stops or flies out.
- Adjust each element's speed without reversing its flight path.
- Preview one element from its inspector, or play the full composition on the editing canvas.
- Export a ZIP with a standalone transparent web component, embedded images, editable JSON, source images, and Agent instructions.
- Re-import the exported ZIP directly for further editing, or import its JSON with the images.
- Respect `prefers-reduced-motion` automatically.
- Switch the complete playground between Chinese and English with a persistent language tab.

## 30-second quick start

The exported website component does not require React or npm.

1. Open the site and choose **Start making** to enter the editor.
2. Add transparent images, then select each ornament to edit its position and motion.
3. Click **Export**, preview the motion, then download and extract `float-up-website.zip`.
4. Copy `float-up.js` to your website and paste the HTML snippet in the package's `README.md`.

Only `float-up.js` is needed at runtime; it includes the images and has a transparent background. The package also includes `float-up-layout.json`, original images, and `AGENTS.md` so a coding agent can integrate or revise the scene.

## React source component

The reusable React implementation remains available in [`src/float-up`](src/float-up). This source API is optional when using the website package.

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
  motion: {
    durationMs: 2800,
    easing: { x1: 0.22, y1: 1, x2: 0.36, y2: 1 },
  },
  items: [
    {
      id: 'star',
      src: 'ornaments/star.png',
      target: { x: 0.12, y: 0.18 },
      width: 0.1,
      rotation: -8,
      spin: 0,
      exitMode: 'fly-out',
      motion: {
        durationMs: 3200,
        directionDeg: 270,
        easing: { x1: 0.22, y1: 1, x2: 0.36, y2: 1 },
      },
    },
  ],
}

export function Hero() {
  const floatUp = useRef<FloatUpController>(null)

  return (
    <div style={{ height: '100vh' }}>
      <FloatUp ref={floatUp} config={config} assetBaseUrl={import.meta.env.BASE_URL}>
        <h1>Your central content</h1>
      </FloatUp>
      <button onClick={() => floatUp.current?.replay()}>Replay</button>
    </div>
  )
}
```

The stage fills its parent, so give the parent an explicit height. By default, scroll progress is read from the window over `1.15` viewport heights starting at page offset `0`.
`assetBaseUrl` prefixes relative image sources. The example uses Vite's deployment base, so it also works when the site is hosted under a subpath. In another build system, pass that system's public base URL instead.

## Save and restore a layout

The exported ZIP contains `float-up-layout.json` and the original PNG/WebP images in `ornaments/`. To resume editing, click **+** and select the ZIP directly, or drop it onto the canvas. You can also select the JSON together with those images. If the images are already loaded in the current session, or the layout only uses bundled demo images, selecting the JSON alone is enough. The importer reports each missing image without replacing the current layout.

The exported configuration uses safe filenames under `ornaments/`. When moving a layout into your React project, put the images in `public/ornaments/` under the exported filenames. Files whose original names contain spaces or non-Latin characters need to be renamed to the paths shown in the JSON.

## Public API

### `<FloatUp />`

```ts
type FloatUpProps = {
      config: FloatUpConfig
      assetBaseUrl?: string
      scroll?: false | {
    startOffsetPx?: number
    distanceVh?: number
  }
  className?: string
  children?: React.ReactNode
}
```

- `config` contains the reserved area and every ornament's source, anchor point, size, and rotation.
- `item.motion` sets that ornament's travel direction, full-flight Replay duration, and cubic Bézier speed curve. `config.motion` remains the default for older layouts.
- `item.exitMode` is `stop` by default. `fly-out` makes the image pass through `target` and leave the stage along `directionDeg`.
- `scroll={false}` displays the final state until Replay is called; fly-out items are offstage after their flight.
- `scroll.startOffsetPx` sets the document scroll position where the rise begins.
- `scroll.distanceVh` sets how many viewport heights complete the rise.
- `children` renders inside the reserved central area.
- `assetBaseUrl` prefixes relative item sources; absolute URLs and root-relative paths are left as provided.
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
- `rotation` uses degrees. The legacy `spin` field is retained for configuration compatibility but has no visual effect.
- `motion.directionDeg` is the travel angle in screen coordinates; `270` means rising from below.
- The speed curve changes progress along a single flight path; it never moves an image beyond an endpoint and back.
- `exitMode: 'fly-out'` treats `target` as a point along the flight path, while `stop` ends the flight there.
- `reservedArea` uses normalized top-left coordinates plus normalized width and height.
- Exported configuration uses `version: 1` so future readers can migrate formats safely.

## Visual speed-curve editor

Select an ornament in the editor to open its motion inspector. The graph edits that ornament's cubic Bézier curve:

- Drag `P1` and `P2` directly on the canvas.
- X coordinates stay between `0` and `1`, preserving a valid time mapping.
- Y coordinates stay between `0` and `1`, so the image travels in one direction without reversing.
- Use Gentle, Linear, Ease out, or S-curve presets as starting points.
- Tune travel duration from `0.5` to `30` seconds.
- Click **Preview animation** to replay only the selected element on the editing canvas. The toolbar play icon previews the full composition in place.

Each ornament has its own curve, travel direction, and duration. Faster ornaments finish earlier in both scroll and Replay playback. All settings are included in the website package and editable JSON.

## Image guidelines

- Supported in the playground: static PNG and WebP.
- Files must contain at least one transparent pixel and at least one visible pixel.
- Leave a little transparent padding around the subject, but avoid extremely large empty margins.
- Use clear filenames; the exporter converts them into safe paths under `ornaments/`.
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
public/landing/   Fluent Emoji floating art and Figma title-card artwork
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

Code and the files in `public/demo/` are released under the [MIT License](LICENSE). The neutral demo ornaments and social preview were created specifically for Float Up with OpenAI image generation tools and are included as project assets under the same license. The looping SVG artwork in `public/landing/` comes from Microsoft Fluent Emoji and retains its [upstream MIT license and attribution](public/landing/SOURCE.md). The title-card artwork comes from the user's [Figma design](public/landing/card/SOURCE.md).

---

## 中文说明

Float Up 把透明图片变成一组从页面底部平静上浮、轻微旋转并落在中央内容四周的装饰元素。

介绍页使用独立的循环上浮背景，由 Microsoft Fluent Emoji 的透明二维 SVG 素材组成；素材来源和许可证见 [`public/landing/SOURCE.md`](public/landing/SOURCE.md)。编辑页仍用于制作、预览和导出 Float Up 布局。

网站先展示介绍页，点击 **开始制作** 进入编辑平台。上传透明 PNG/WebP 后，可以逐个拖动终点、精确输入坐标、调整尺寸和旋转角度，再分别设置移动方向、时长及三次贝塞尔速度曲线。完成后点击 **导出网页动效包**，获得透明背景的独立网页组件、全部图片、可编辑 JSON 和 Agent 接入说明。图片只在浏览器本地处理，不会上传到服务器。

重新编辑时，直接点击 **导入动效包** 选择之前导出的 ZIP。也可以从 ZIP 中取出 `float-up-layout.json` 和 `ornaments/` 里的图片一起导入。JSON 本身不包含图片；独立的 `float-up.js` 则已经内嵌图片，放进网站时只需这一个文件。React 源码组件仍然保留，供需要直接集成 React 的开发者使用。

快速使用：

1. 打开[在线演示](https://saisai-me.github.io/float-up/)，点击 **开始制作**。
2. 上传透明图片并点击 **编辑布局** 调整。
3. 点击 **导出网页动效包**，解压后将 `float-up.js` 放进网站的静态文件目录。
4. 按压缩包 `README.md` 中的代码插入页面；将压缩包交给 Agent 时，可让其读取 `AGENTS.md`。

当前仅面向桌面网页，支持静态 PNG/WebP；移动端、Lottie、SVG、GIF 和视频导出不属于 v1 范围。
