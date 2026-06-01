import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { InterviewProvider } from './context/InterviewContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InterviewProvider>
      <App />
    </InterviewProvider>
  </StrictMode>,
)
