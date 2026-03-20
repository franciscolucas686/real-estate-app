import { StrictMode } from 'react';
import ReactDom from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { hideMobileNavBar } from './utils/hideMobileNavBar.ts';

hideMobileNavBar();

ReactDom.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
