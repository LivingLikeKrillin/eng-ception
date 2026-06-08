import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { db } from './store/db'
import { setSink, installDevEgress } from './services/analytics'
import { localAnalyticsSink } from './store/localAnalyticsSink'
import { registerAnalyticsLifecycle } from './services/analyticsLifecycle'
import { isFirebaseConfigured } from './services/firebase'
import { registerAuthReaction } from './store/auth'
import { registerInstallPrompt } from './services/pwa/installPrompt'

async function bootstrap() {
  await db.init()
  registerInstallPrompt()

  // Telemetry: default facade sink is noop; wire the local ring buffer unless disabled.
  if (import.meta.env.VITE_DISABLE_ANALYTICS !== 'true') {
    setSink(localAnalyticsSink)
    registerAnalyticsLifecycle()
    if (import.meta.env.DEV) installDevEgress()
  }

  // Cloud tier is additive: only when Firebase is configured. The reaction swaps the
  // db adapter (and analytics sink) to Firestore once a Google user is present.
  if (isFirebaseConfigured()) {
    registerAuthReaction()
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
