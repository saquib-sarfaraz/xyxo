import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

const BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL
    ? import.meta.env.BASE_URL
    : '/'

const BASENAME =
  BASE_URL.length > 1 && BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter
      basename={BASENAME}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <App />
    </BrowserRouter>
  </StrictMode>,
)
