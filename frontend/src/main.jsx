import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global fetch interceptor to inject role-based credentials in request headers
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    const user = JSON.parse(savedUser);
    options.headers = {
      ...options.headers,
      'x-user-role': user.role,
      'x-user-id': String(user.id),
      'x-user-username': user.username
    };
  }
  return originalFetch(url, options);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
