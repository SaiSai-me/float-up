# React API

The exported website package is the quickest way to embed a scene. This document covers the reusable React source component in [`src/float-up`](../src/float-up).

## Example

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

Give the parent an explicit height. `assetBaseUrl` prefixes relative image paths; for Vite, `import.meta.env.BASE_URL` also supports deployments under a subpath.

## Props

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

- `config` contains the reserved area and all images. Per-item `motion` sets direction, duration, and cubic Bézier timing. `config.motion` is the default for older layouts.
- `exitMode: 'stop'` ends at `target`. `exitMode: 'fly-out'` passes through `target` and leaves the stage along `directionDeg`.
- `scroll={false}` shows the final state until `replay()` is called. Otherwise, scroll progress begins at `startOffsetPx` (default `0`) and spans `distanceVh` viewport heights (default `1.15`).
- `children` render inside the reserved central area. The ref exposes `replay()`.

## Configuration coordinates

- `target.x` and `target.y` are normalized image-center coordinates from `0` to `1`.
- `width` is the image width divided by the stage width. `rotation` and `motion.directionDeg` use degrees; `270` means rising from below.
- The legacy `spin` field remains in the type for compatibility but has no visual effect.
- Cubic Bézier control points stay within `0–1` on both axes. The curve changes speed along one path and cannot cause an image to overshoot and return.
- `reservedArea` uses normalized top-left coordinates plus width and height. Configurations currently use `version: 1`.

## Layout generation

```ts
createFloatUpLayout(metadata, {
  reservedArea,
  stageAspectRatio: 16 / 9,
})
```

The function uses visible-alpha bounds to normalize size, places images outside the reserved rectangle, and runs a deterministic collision pass. Per-frame rendering only updates transforms. Decorative images are hidden from assistive technology unless an item has an `alt` value; reduced-motion preference is respected.

## Importing a saved scene

The exported ZIP contains `float-up-layout.json` and image originals in `ornaments/`. To use that configuration in a React project, put the images in `public/ornaments/` under the exported filenames. The standalone `float-up.js` already embeds those images and needs no additional files.
