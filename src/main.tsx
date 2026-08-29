import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { NotificationProvider } from './contexts/NotificationContext'
import { ThemeProviderWrapper } from './contexts/ThemeContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <ThemeProviderWrapper>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </ThemeProviderWrapper>
    </HashRouter>
  </StrictMode>,
)
