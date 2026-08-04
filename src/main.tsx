import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { ThemeProviderWrapper } from './contexts/ThemeContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <ThemeProviderWrapper>
        <App />
      </ThemeProviderWrapper>
    </HashRouter>
  </StrictMode>,
)
