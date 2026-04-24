// Handle Supabase OAuth hash redirect
// Supabase puts tokens in #hash which crashes React Router's BrowserRouter.
// We strip the hash synchronously, but first store the raw hash so Supabase
// can process it when it initializes.
(function() {
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    // Store hash temporarily for Supabase to read
    try {
      sessionStorage.setItem('__sb_hash', hash);
    } catch {}
    // Clean URL immediately to prevent Router crash
    window.history.replaceState(null, '', '/');
  }
})();

import './lib/prefetch';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
document.documentElement.classList.add("dark");

// If we captured a hash, restore it temporarily for Supabase to detect
const savedHash = sessionStorage.getItem('__sb_hash');
if (savedHash) {
  sessionStorage.removeItem('__sb_hash');
  // Set hash back briefly for Supabase detectSessionInUrl
  window.location.hash = savedHash.substring(1);
  // Import and init Supabase to process the tokens
  import('@/integrations/supabase/client').then(({ supabase }) => {
    supabase.auth.getSession().then(() => {
      // Clean hash again after Supabase processed it
      window.history.replaceState(null, '', '/');
      createRoot(document.getElementById("root")!).render(<App />);
    });
  });
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
