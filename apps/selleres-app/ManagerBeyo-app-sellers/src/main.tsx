import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { KeyboardInsetProvider } from '@beyo/ui'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Sellers has no app-level provider tree yet, so the keyboard inset provider stays at the root. */}
    <KeyboardInsetProvider>
      <App />
    </KeyboardInsetProvider>
  </StrictMode>,
)
