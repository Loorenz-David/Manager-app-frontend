import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { deleteLegacyShopifyProductSyncDrafts } from '@beyo/shopify';
import { App } from './app/App';
import './lib/env';
import './index.css';

// The Shopify product form no longer keeps drafts in the browser.
deleteLegacyShopifyProductSyncDrafts();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="h-full bg-background" vaul-drawer-wrapper="">
      <App />
    </div>
  </StrictMode>,
)
