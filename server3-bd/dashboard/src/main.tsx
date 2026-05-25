import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Aplicar tema guardado antes de montar React (evita flash)
const savedTheme = localStorage.getItem('kira-theme');
if (savedTheme === 'light') {
  document.documentElement.classList.add('light-theme');
  document.body.classList.add('light-theme');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
