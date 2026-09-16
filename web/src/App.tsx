import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { ClientDetailPage } from "./pages/ClientDetailPage";
import { EmailConnectionsPage } from "./pages/EmailConnectionsPage";
import { EmailInboxPage } from "./pages/EmailInboxPage";

export function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <span className="app-logo">TM Express</span>
          <nav className="app-nav">
            <Link to="/">Dashboard</Link>
            <Link to="/email-connections">Email connections</Link>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/clients/:id" element={<ClientDetailPage />} />
            <Route path="/email-connections" element={<EmailConnectionsPage />} />
            <Route path="/email-connections/:id" element={<EmailInboxPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
