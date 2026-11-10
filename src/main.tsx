import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Remove the startup loader from index.html once the page has finished loading.
// It stays up for at least MIN_SPLASH_MS so it never just flashes, and is
// removed after MAX_WAIT_MS no matter what so it can never get stuck.
const MIN_SPLASH_MS = 700
const MAX_WAIT_MS = 6000

function hideBootLoader() {
  const el = document.getElementById('boot-loader')
  if (!el) return

  const pageLoaded =
    document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          window.addEventListener('load', () => resolve(), { once: true })
          setTimeout(resolve, MAX_WAIT_MS)
        })

  pageLoaded.then(() => {
    const wait = Math.max(0, MIN_SPLASH_MS - performance.now())
    setTimeout(() => {
      requestAnimationFrame(() => {
        el.classList.add('boot-hide')
        setTimeout(() => el.remove(), 400)
      })
    }, wait)
  })
}

hideBootLoader()