import { Buffer } from 'buffer';
import 'process';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx';
import Code from './Code.jsx';
import SentinelSignButton from './Cosmo.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SentinelSignButton/>
  </StrictMode>,
)
