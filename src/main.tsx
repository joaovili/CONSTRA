import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { repairData } from './lib/maintenance.ts'
import { seedIfEmpty } from './lib/seeds.ts'

seedIfEmpty().then(repairData).catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
