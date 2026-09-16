import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, Dashboard, Todo } from "../lib/api";
import { ClientForm } from "../components/ClientForm";
import { Modal } from "../components/Modal";
import { TodoList } from "../components/TodoList";
import { formatDate, isOverdue, isVisitOverdue } from "../lib/dates";
import { bandLabel } from "../lib/ocrs";

const onboardingLabel: Record<string, string> = {
  PENDING_DVLA: "Pending DVLA",
  APPROVED: "Approved",
};

const complianceLabel: Record<string, string> = {
  GREEN: "Green",
  AMBER: "Amber",
  RED: "Red",
  ONBOARDING: "Onboarding",
};

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filterClientId, setFilterClientId] = useState<string>("");

  async function load() {
    setLoading(true);
    const [dashboardData, todosData] = await Promise.all([
      api.getDashboard(),
      api.listAllTodos(),
    ]);
    setDashboard(dashboardData);
    setTodos(todosData);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const clients = useMemo(
    () => (dashboard?.clients ?? []).filter((c) => !filterClientId || c.id === filterClientId),
    [dashboard, filterClientId]
  );
  const drivers = useMemo(
    () => (dashboard?.drivers ?? []).filter((d) => !filterClientId || d.clientId === filterClientId),
    [dashboard, filterClientId]
  );
  const filteredTodos = useMemo(
    () => todos.filter((t) => !filterClientId || t.clientId === filterClientId),
    [todos, filterClientId]
  );

  if (loading || !dashboard) return <div className="page">Loading…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <div className="page-header-actions">
          <select
            className="filter-select"
            value={filterClientId}
            onChange={(e) => setFilterClientId(e.target.value)}
          >
            <option value="">All clients</option>
            {dashboard.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            + Add client
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        <div>
          <section className="card">
            <h2>Clients ({clients.length})</h2>
            {clients.length === 0 ? (
              <p className="empty-state">No clients yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Onboarding</th>
                    <th>Compliance</th>
                    <th>OCRS</th>
                    <th>Vehicles</th>
                    <th>Drivers</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/clients/${c.id}`}>{c.companyName}</Link>
                      </td>
                      <td>
                        <span className={`badge badge-${c.onboardingStatus.toLowerCase()}`}>
                          {onboardingLabel[c.onboardingStatus]}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${c.complianceStatus.toLowerCase()}`}>
                          {complianceLabel[c.complianceStatus]}
                        </span>
                      </td>
                      <td>
                        {c.latestOcrsBand ? (
                          <span className={`badge badge-${c.latestOcrsBand.toLowerCase()}`}>
                            {c.latestOcrsBand}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{c.vehicleCount}</td>
                      <td>{c.driverCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="card">
            <h2>Client onboarding</h2>
            {clients.filter((c) => c.onboardingStatus === "PENDING_DVLA").length === 0 ? (
              <p className="empty-state">No clients currently pending DVLA approval.</p>
            ) : (
              <ul className="todo-list">
                {clients
                  .filter((c) => c.onboardingStatus === "PENDING_DVLA")
                  .map((c) => (
                    <li key={c.id} className="todo-item">
                      <Link to={`/clients/${c.id}`}>{c.companyName}</Link>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <section className="card">
            <h2>Last visit logged</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Last visit</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/clients/${c.id}`}>{c.companyName}</Link>
                    </td>
                    <td className={isVisitOverdue(c.lastVisitDate) ? "overdue" : ""}>
                      {c.lastVisitDate ? formatDate(c.lastVisitDate) : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card">
            <h2>Last PMI received</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Last PMI</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/clients/${c.id}`}>{c.companyName}</Link>
                    </td>
                    <td>{c.lastPmiDate ? formatDate(c.lastPmiDate) : "None on file"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card">
            <h2>Last brake test received</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Last brake test</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/clients/${c.id}`}>{c.companyName}</Link>
                    </td>
                    <td>{c.lastBrakeTestDate ? formatDate(c.lastBrakeTestDate) : "None on file"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card">
            <h2>OCRS status</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Latest band</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/clients/${c.id}`}>{c.companyName}</Link>
                    </td>
                    <td>
                      {c.latestOcrsBand ? (
                        <span className={`badge badge-${c.latestOcrsBand.toLowerCase()}`}>
                          {bandLabel[c.latestOcrsBand]}
                        </span>
                      ) : (
                        "No entries yet"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card">
            <h2>Drivers ({drivers.length})</h2>
            {drivers.length === 0 ? (
              <p className="empty-state">No drivers yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Client</th>
                    <th>Licence check due</th>
                    <th>CPC due</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((d) => (
                    <tr key={d.id}>
                      <td>{d.name}</td>
                      <td>
                        <Link to={`/clients/${d.clientId}`}>{d.clientName}</Link>
                      </td>
                      <td className={isOverdue(d.licenceCheckDueDate) ? "overdue" : ""}>
                        {formatDate(d.licenceCheckDueDate)}
                      </td>
                      <td className={isOverdue(d.cpcDueDate) ? "overdue" : ""}>
                        {formatDate(d.cpcDueDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <div>
          <section className="card">
            <h2>Todo ({filteredTodos.length})</h2>
            <TodoList todos={filteredTodos} showClient={!filterClientId} />
          </section>
        </div>
      </div>

      {showAdd && (
        <Modal title="Add client" onClose={() => setShowAdd(false)}>
          <ClientForm
            onSubmit={async (data) => {
              await api.createClient(data);
              setShowAdd(false);
              await load();
            }}
            onCancel={() => setShowAdd(false)}
          />
        </Modal>
      )}
    </div>
  );
}
