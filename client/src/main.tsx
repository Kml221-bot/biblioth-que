import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Sentry — actif uniquement si VITE_SENTRY_DSN est défini
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Capture 10 % des sessions en production, 100 % en dev
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Replay : 1 % des sessions, 100 % des erreurs
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Ne pas capturer les erreurs réseau normales (offline mode)
    ignoreErrors: [
      "NetworkError",
      "Failed to fetch",
      "Load failed",
      "AbortError",
    ],
  });
}

if (import.meta.env.DEV && "serviceWorker" in navigator) {
  void navigator.serviceWorker
    .getRegistrations()
    .then(registrations =>
      Promise.all(registrations.map(registration => registration.unregister()))
    )
    .catch(() => undefined);
}

if (import.meta.env.DEV && "caches" in window) {
  void caches
    .keys()
    .then(keys => Promise.all(keys.map(key => caches.delete(key))))
    .catch(() => undefined);
}

createRoot(document.getElementById("root")!).render(<App />);
