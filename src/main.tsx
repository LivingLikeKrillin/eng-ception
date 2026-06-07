import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { db } from './store/db'
import { setSink, installDevEgress } from './services/analytics'
import { localAnalyticsSink } from './store/localAnalyticsSink'
import { registerAnalyticsLifecycle } from './services/analyticsLifecycle'

async function bootstrap() {
  await db.init()

  // Telemetry: default facade sink is noop; wire the local ring buffer unless disabled.
  if (import.meta.env.VITE_DISABLE_ANALYTICS !== 'true') {
    setSink(localAnalyticsSink)
    registerAnalyticsLifecycle()
    if (import.meta.env.DEV) installDevEgress()
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
