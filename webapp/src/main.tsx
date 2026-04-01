import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

function App() {
  return <h1>Babylon.js Social Helper</h1>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
