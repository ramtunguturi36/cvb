import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './env-check.js'

// Validate required environment variables
const requiredEnvVars = ['VITE_RAZORPAY_KEY_ID', 'VITE_RAZORPAY_KEY_SECRET'];
requiredEnvVars.forEach(varName => {
  if (!import.meta.env[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
    // Add the current environment variables for debugging
    console.log('Available environment variables:', import.meta.env);
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
