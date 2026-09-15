import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ClientsListPage } from "./pages/ClientsListPage";
import { ClientDetailPage } from "./pages/ClientDetailPage";

export function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <span className="app-logo">TM Express</span>
        </header>
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
