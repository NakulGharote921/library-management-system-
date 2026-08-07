import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@flaticon/flaticon-uicons/css/regular/straight.css'
import '@flaticon/flaticon-uicons/css/solid/rounded.css'
import { getInitialTheme, applyTheme } from './utils/theme.js'
import { CategoryProvider } from './store/CategoryProvider.jsx'
import App from './App.jsx'

applyTheme(getInitialTheme())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CategoryProvider>
      <App />
    </CategoryProvider>
  </StrictMode>,
)
