import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { store } from "./shared/store";
import { AuthProvider } from "./shared/auth";
import App from "./App";
import "./index.css";

// Eager theme initialization — applies saved theme before first render
// so pages outside <Layout> (e.g. Landing) don't flash light on F5.
import "./shared/hooks/use-theme";
import "./shared/hooks/use-color-theme";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found. Ensure index.html contains <div id='root'></div>");
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <Provider store={store}>
        <BrowserRouter>
          <App />
          <Toaster position="top-right" richColors closeButton />
        </BrowserRouter>
      </Provider>
    </AuthProvider>
  </StrictMode>
);
