import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { bootstrapLibrary } from './lib/ascendCatalog.ts'
import { repairData } from './lib/maintenance.ts'

bootstrapLibrary().then(repairData).catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
