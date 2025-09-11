import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { Button } from "@pva/ui";

function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-pva-terracotta-dark text-white">
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">PVA Bazaar (.org)</h1>
        <div className="space-x-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tertiary">Tertiary</Button>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
