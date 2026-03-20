import React from "react";
import ReactDOM from "react-dom/client";
import { TaskBoard } from "./components/TaskBoard/TaskBoard";
import "./index.css";

async function init() {
  if (import.meta.env.DEV) {
    const { setupWorker } = await import("msw/browser");
    const { handlers } = await import("./mocks/handlers");
    const worker = setupWorker(...handlers);
    await worker.start({ onUnhandledRequest: "bypass" });
  }
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <TaskBoard />
    </React.StrictMode>
  );
}

init();