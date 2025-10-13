import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import App from "./App";
import Admin from "./Admin";
import Join from "./Join";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <Router basename="/">
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<Admin />} />
        <Route
          path="/join"
          element={<Join onJoin={(name) => (window.location.href = "/")} />}
        />
        {/* fallback route nếu path không hợp lệ */}
        <Route path="*" element={<App />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
