import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import "./index.css";

import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { store } from "./app/store";
import { connectSocket } from "./services/socket";
import { initTheme } from "./utils/theme";
import { I18nProvider } from "./i18n";
import { initSentry } from "./core/monitoring/sentry";

initSentry();

const token = localStorage.getItem("token");
if (token) {
  connectSocket(token);
}

initTheme();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <I18nProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </BrowserRouter>
      </I18nProvider>
    </Provider>
  </React.StrictMode>
);
