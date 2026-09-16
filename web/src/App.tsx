import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ClientsListPage } from "./pages/ClientsListPage";
import { ClientDetailPage } from "./pages/ClientDetailPage";
import { isDemoMode } from "./lib/api";
import { resetDemoStore } from "./lib/mockApi";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

export function App() {
  return (
    <BrowserRouter basename={basename}>
      <div className="app-shell">
        <header className="app-header">
          <span className="app-logo">TM Express</span>
        </header>
        {isDemoMode && (
          <div className="demo-banner">
            Static demo — sample data only, stored in this browser. Nothing here is a real
            client.{" "}
            <button
              className="link-btn"
              onClick={() => {
                resetDemoStore();
                window.location.href = basename + "/";
              }}
            >
              Reset demo data
            </button>
          </div>
        )}
        <main>
          <Routes>
            <Route path="/" element={<ClientsListPage />} />
            <Route path="/clients/:id" element={<ClientDetailPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
