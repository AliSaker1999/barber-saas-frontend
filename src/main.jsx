import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import "./index.css";

import App from "./App";
import { store } from "./app/store";
import { connectSocket } from "./services/socket";
import { initTheme } from "./utils/theme";

const token = localStorage.getItem("token");
if (token) {
  connectSocket(token);
}

initTheme();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
