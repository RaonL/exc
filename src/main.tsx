import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './configuration.css';
import './training/training.css';
import './console-lab.css';
import './origin-editor.css';
import './load-balancer-editor.css';
import './waf-editor.css';
import './security-events.css';
import './console-refinement.css';
import './editor-refinement.css';
import './xc-reference.css';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
