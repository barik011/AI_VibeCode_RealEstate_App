import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { CatalogProvider } from './hooks/useCatalog';
import App from './App';
import './styles.css';
import './i18n/rtl.css';
import './features/crm/crm.css';
import { LanguageProvider } from './i18n/LanguageProvider';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <LanguageProvider>
          <CatalogProvider>
            <App />
          </CatalogProvider>
        </LanguageProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
);
