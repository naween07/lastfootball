// Strip Supabase OAuth hash BEFORE any imports — must be synchronous
// Supabase SDK will read tokens from localStorage after initial parse
(function() {
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    // Parse tokens from hash and store them so Supabase can pick them up
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken) {
      // Store in localStorage where Supabase expects them
      const storageKey = 'sb-ehfyctoaudhyrjxbftty-auth-token';
      const session = {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: params.get('token_type') || 'bearer',
        expires_in: parseInt(params.get('expires_in') || '3600'),
        expires_at: Math.floor(Date.now() / 1000) + parseInt(params.get('expires_in') || '3600'),
      };
      try {
        localStorage.setItem(storageKey, JSON.stringify(session));
      } catch {}
    }
    // Clean URL immediately
    window.history.replaceState(null, '', '/');
  }
})();

import './lib/prefetch';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
document.documentElement.classList.add("dark");
createRoot(document.getElementById("root")!).render(<App />);
