import type { CSSProperties } from 'react'

type Ornament = {
  name: string
  x: number
  size: number
  duration: number
  delay: number
  drift: number
  restY: number
}

const ornaments: Ornament[] = [
  { name: 'balloon', x: 7, size: 102, duration: 34, delay: -17, drift: 42, restY: 20 },
  { name: 'butterfly', x: 16, size: 88, duration: 16, delay: -13, drift: -28, restY: 63 },
  { name: 'cherry-blossom', x: 25, size: 82, duration: 29, delay: -6, drift: 32, restY: 34 },
  { name: 'comet', x: 34, size: 94, duration: 13, delay: -8, drift: -24, restY: 78 },
  { name: 'crescent-moon', x: 43, size: 100, duration: 36, delay: -11, drift: 34, restY: 15 },
  { name: 'four-leaf-clover', x: 53, size: 82, duration: 24, delay: -19, drift: -36, restY: 70 },
  { name: 'gem-stone', x: 63, size: 88, duration: 18, delay: -3, drift: 28, restY: 42 },
  { name: 'glowing-star', x: 73, size: 100, duration: 15, delay: -7, drift: -30, restY: 20 },
  { name: 'magic-wand', x: 83, size: 94, duration: 31, delay: -24, drift: 38, restY: 67 },
  { name: 'rainbow', x: 94, size: 108, duration: 33, delay: -12, drift: -42, restY: 36 },
  { name: 'rocket', x: 10, size: 108, duration: 12, delay: -2, drift: 44, restY: 82 },
  { name: 'shooting-star', x: 29, size: 112, duration: 14, delay: -11, drift: 30, restY: 17 },
  { name: 'sunflower', x: 72, size: 94, duration: 28, delay: -5, drift: 34, restY: 79 },
  { name: 'tropical-fish', x: 90, size: 98, duration: 19, delay: -14, drift: -30, restY: 12 },
]

export function LandingBackdrop() {
  return (
    <div className="landing-backdrop" aria-hidden="true">
      {ornaments.map((ornament) => (
        <span
          className="landing-float-item"
          key={ornament.name}
          style={{
            left: `${ornament.x}%`,
            animationDuration: `${ornament.duration}s`,
            animationDelay: `${ornament.delay}s`,
            '--size': `${ornament.size}px`,
            '--drift': `${ornament.drift}px`,
            '--rest-y': `${ornament.restY}%`,
          } as CSSProperties}
        >
          <img src={`${import.meta.env.BASE_URL}landing/${ornament.name}.svg`} alt="" draggable={false} />
        </span>
      ))}
    </div>
  )
}
