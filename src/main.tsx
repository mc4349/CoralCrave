import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { registerServiceWorker } from './lib/serviceWorker.ts'
import './utils/agoraDebug.ts' // Load Agora debugging utilities
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)

// Register service worker for PWA functionality
if (import.meta.env.PROD) {
  registerServiceWorker()
}
