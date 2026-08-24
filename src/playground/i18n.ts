import type { ImageFileErrorCode } from './imageFiles'

export type Locale = 'zh' | 'en'

export type Notice = {
  key: 'intro' | 'arranged' | 'replaying' | 'autoLayout' | 'demoRestored' | 'removed' | 'reset' | 'copied' | 'downloaded'
  count?: number
  durationMs?: number
}

export const messages = {
  en: {
    languageLabel: 'Language',
    githubLabel: 'Float Up on GitHub',
    toolbar: {
      checking: 'Checking…',
      addImages: '+ Add images',
      autoArrange: 'Auto arrange',
      doneEditing: 'Done editing',
      editLayout: 'Edit layout',
      replay: '↻ Replay',
      copyReact: 'Copy React',
      downloadJson: 'Download JSON',
    },
    notice: {
      intro: 'Try the sample, or add your own transparent images.',
      arranged: (count: number) => `${count} image${count === 1 ? '' : 's'} arranged locally. Nothing was uploaded.`,
      replaying: (durationMs: number) => `Replaying the complete ${(durationMs / 1000).toFixed(1)} second rise.`,
      autoLayout: 'A fresh deterministic layout has been applied.',
      demoRestored: 'The original Float Up demo ornaments are back.',
      removed: 'Ornament removed from this layout.',
      reset: 'This ornament has returned to its automatic position.',
      copied: 'React config copied. Add the matching files to public/ornaments/.',
      downloaded: 'float-up-layout.json downloaded.',
    },
    errors: {
      heading: 'Some images were skipped',
      dismiss: 'Dismiss errors',
      unsupported: 'only transparent PNG and WebP files are supported.',
      decode: 'the browser could not decode this image.',
      inspect: 'this browser cannot inspect the image.',
      opaque: 'no transparent pixels were found.',
      empty: 'the image appears to be fully transparent.',
      unknown: 'unable to inspect this image.',
    } satisfies Record<'heading' | 'dismiss' | ImageFileErrorCode, string>,
    center: {
      eyebrow: 'OPEN-SOURCE REACT EFFECT',
      description: 'Upload transparent images. Let them rise, drift, and settle around your content.',
      workflowLabel: 'Workflow',
      steps: ['Upload', 'Arrange', 'Edit', 'Export'],
      reserved: 'Reserved content area',
    },
    playgroundLabel: 'Float Up playground',
    editor: {
      ariaLabel: 'Layout editor',
      heading: 'LAYOUT EDITOR',
      select: 'Select an ornament',
      close: 'Close editor',
      size: 'Size',
      rotation: 'Rotation',
      reset: 'Reset this item',
      delete: 'Delete item',
      help: 'Drag an ornament to move it. Select it to resize, rotate, reset, or delete. Arrow keys move by 0.5%; hold Shift for 2%.',
      restoreDemo: 'Restore demo ornaments',
      editItem: (id: string) => `Edit ${id}. Use arrow keys to move and Delete to remove.`,
      resizeItem: (id: string) => `Resize ${id}`,
      motion: {
        title: 'Speed curve',
        description: 'Drag P1 and P2 to shape how quickly the ornaments rise. Vertical overshoot is supported.',
        canvasLabel: 'Editable cubic Bézier speed curve with draggable control points',
        duration: 'Replay duration',
        seconds: 's',
        presets: 'Curve presets',
        presetNames: {
          gentle: 'Gentle',
          linear: 'Linear',
          easeOut: 'Ease out',
          smooth: 'S-curve',
          overshoot: 'Overshoot',
        },
        controlPoint: (number: number) => `Control point ${number}`,
        preview: 'Preview motion',
        reset: 'Reset curve',
      },
    },
    scrollCue: 'SCROLL TO FLOAT',
    notes: {
      eyebrow: 'ONE MOTION, YOUR IMAGES',
      title: 'From transparent files to a reusable React scene.',
      description: 'Float Up keeps the runtime deliberately small: one animation loop, transform-only motion, deterministic layout, and no uploads.',
      cards: [
        { title: 'Private by default', body: 'PNG and WebP files are decoded, checked, and arranged entirely inside your browser.' },
        { title: 'Calm motion', body: 'Every object rises under its final X position, with a shared ease-out and a soft mid-flight turn.' },
        { title: 'Copy the source', body: 'Export versioned JSON or copy typed React configuration, then bring the small component folder into your project.' },
      ],
      restoreDemo: 'Restore demo',
      viewGithub: 'View source on GitHub ↗',
    },
    drop: {
      title: 'Drop transparent images',
      detail: 'PNG or WebP · processed locally',
    },
  },
  zh: {
    languageLabel: '语言',
    githubLabel: '在 GitHub 查看 Float Up',
    toolbar: {
      checking: '检查中…',
      addImages: '+ 添加图片',
      autoArrange: '自动排版',
      doneEditing: '完成编辑',
      editLayout: '编辑布局',
      replay: '↻ 重播',
      copyReact: '复制 React',
      downloadJson: '下载 JSON',
    },
    notice: {
      intro: '体验示例素材，或添加你自己的透明图片。',
      arranged: (count: number) => `已在本地排版 ${count} 张图片，没有上传任何文件。`,
      replaying: (durationMs: number) => `正在重播完整的 ${(durationMs / 1000).toFixed(1)} 秒上浮动画。`,
      autoLayout: '已应用一组新的确定性自动布局。',
      demoRestored: '已恢复 Float Up 原始示例素材。',
      removed: '已从当前布局中移除这个元素。',
      reset: '这个元素已恢复到自动排版位置。',
      copied: 'React 配置已复制，请把对应图片放入 public/ornaments/。',
      downloaded: '已下载 float-up-layout.json。',
    },
    errors: {
      heading: '部分图片已跳过',
      dismiss: '关闭错误提示',
      unsupported: '仅支持带透明背景的 PNG 和 WebP 文件。',
      decode: '浏览器无法解码这张图片。',
      inspect: '当前浏览器无法检查这张图片。',
      opaque: '没有检测到透明像素。',
      empty: '这张图片似乎完全透明。',
      unknown: '无法检查这张图片。',
    } satisfies Record<'heading' | 'dismiss' | ImageFileErrorCode, string>,
    center: {
      eyebrow: '开源 REACT 动效',
      description: '上传透明图片，让它们上浮、漂移，并停在你的内容四周。',
      workflowLabel: '使用流程',
      steps: ['上传', '排版', '编辑', '导出'],
      reserved: '中央内容保留区',
    },
    playgroundLabel: 'Float Up 在线编辑器',
    editor: {
      ariaLabel: '布局编辑器',
      heading: '布局编辑器',
      select: '请选择一个漂浮元素',
      close: '关闭编辑器',
      size: '尺寸',
      rotation: '旋转',
      reset: '恢复当前元素',
      delete: '删除当前元素',
      help: '拖动元素改变落点；选中后可以缩放、旋转、恢复或删除。方向键每次移动 0.5%，按住 Shift 时移动 2%。',
      restoreDemo: '恢复示例素材',
      editItem: (id: string) => `编辑 ${id}。使用方向键移动，按 Delete 删除。`,
      resizeItem: (id: string) => `缩放 ${id}`,
      motion: {
        title: '速度曲线',
        description: '拖动 P1 和 P2，改变元素上浮速度的快慢变化；垂直方向支持回弹和超调。',
        canvasLabel: '可拖动控制点的三次贝塞尔速度曲线编辑器',
        duration: '重播时长',
        seconds: '秒',
        presets: '曲线预设',
        presetNames: {
          gentle: '轻柔',
          linear: '匀速',
          easeOut: '快速缓出',
          smooth: '平滑 S 型',
          overshoot: '轻微回弹',
        },
        controlPoint: (number: number) => `控制点 ${number}`,
        preview: '预览动画',
        reset: '重置曲线',
      },
    },
    scrollCue: '向下滚动，让元素上浮',
    notes: {
      eyebrow: '同一种动效，换成你的图片',
      title: '从透明图片到可复用的 React 场景。',
      description: 'Float Up 的运行时保持克制：一个动画循环、仅使用 Transform、确定性布局，并且不会上传图片。',
      cards: [
        { title: '默认保护隐私', body: 'PNG 和 WebP 文件只在你的浏览器内解码、检查和排版。' },
        { title: '平静的运动感', body: '每个元素从最终 X 坐标的正下方升起，共用缓出曲线，并在途中轻微转动。' },
        { title: '直接复制源码', body: '导出带版本的 JSON 或复制类型完整的 React 配置，再把小型组件目录放进你的项目。' },
      ],
      restoreDemo: '恢复示例',
      viewGithub: '在 GitHub 查看源码 ↗',
    },
    drop: {
      title: '放下透明图片',
      detail: 'PNG 或 WebP · 仅在本地处理',
    },
  },
} as const

export function getInitialLocale(): Locale {
  try {
    const saved = window.localStorage.getItem('float-up-locale')
    if (saved === 'zh' || saved === 'en') return saved
  } catch {
    // Continue with the browser language when storage is unavailable.
  }
  return window.navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export function formatNotice(locale: Locale, notice: Notice) {
  const copy = messages[locale].notice
  if (notice.key === 'arranged') return copy.arranged(notice.count ?? 0)
  if (notice.key === 'replaying') return copy.replaying(notice.durationMs ?? 2800)
  return copy[notice.key]
}
