import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Overlay, CursorBadge } from './components/Overlay';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {window.location.hash === '#overlay' ? <Overlay /> : window.location.hash === '#cursor' ? <CursorBadge /> : <App />}
  </React.StrictMode>,
);
