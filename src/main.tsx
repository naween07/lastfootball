import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ─── Force dark mode on every visit ──────────────────────────────────────────
// FotMob-style — football apps look best dark, and this runs BEFORE React
// mounts so there's no light-mode flash on first paint.
document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(<App />);