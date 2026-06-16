import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './navigation/AuthContext.jsx'

// Suppress harmless autoplay policy errors from third-party scripts
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason instanceof DOMException &&
    event.reason.name === 'AbortError' &&
    event.reason.message.includes('play()')
  ) {
    event.preventDefault()
    console.debug('Browser autoplay policy: play() interrupted by pause()')
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
