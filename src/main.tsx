import './lib/prefetch';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
document.documentElement.classList.add("dark");

async function boot() {
  // Supabase OAuth redirects with tokens in URL hash (#access_token=...)
  // React Router crashes on this. Let Supabase read the hash, then clean it.
  if (window.location.hash && window.location.hash.includes('access_token')) {
    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.auth.getSession();
    window.history.replaceState(null, '', '/');
  }
  createRoot(document.getElementById("root")!).render(<App />);
}

boot();
