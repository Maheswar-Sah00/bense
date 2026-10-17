import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { FlowProvider } from './state/FlowContext'
import { registerServiceWorker } from './pwa/registerServiceWorker'
import './styles/tokens.css'
import './styles/app.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <FlowProvider>
        <App />
      </FlowProvider>
    </BrowserRouter>
  </StrictMode>,
)

registerServiceWorker()
