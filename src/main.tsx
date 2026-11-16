import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'

for (const legacyKey of [
  'nuanscape-content',
  'nuanscape-seller-v4',
  'nuanscape-finance',
  'nuanscape-automations',
]) {
  localStorage.removeItem(legacyKey)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
