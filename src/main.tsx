import './lib/prefetch';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
document.documentElement.classList.add("dark");

// Handle Supabase OAuth hash redirect — clean up the URL before React Router mounts
// Supabase puts tokens in the hash (#access_token=...), which breaks BrowserRouter
if (window.location.hash && window.location.hash.includes('access_token')) {
  // Supabase client will pick up the tokens automatically from the hash
  // We just need to let it process, then clean the URL
  import('@/integrations/supabase/client').then(({ supabase }) => {
    supabase.auth.getSession().then(() => {
      // Clean the URL hash after session is established
      window.history.replaceState(null, '', window.location.pathname || '/');
      createRoot(document.getElementById("root")!).render(<App />);
    });
  });
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
