import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Playground } from './playground/Playground'
import '@fontsource/caveat/latin-700.css'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Playground />
  </StrictMode>,
)
