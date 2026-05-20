import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="h-full bg-background" vaul-drawer-wrapper="">
      <App />
    </div>
  </StrictMode>,
)
