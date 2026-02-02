import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.tsx";
import { ThemeProvider } from "./context/ThemeContext";
import "./index.css"; // 전역 스타일

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
