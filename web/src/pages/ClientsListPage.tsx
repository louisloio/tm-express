import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Client } from "../lib/api";
import { ClientForm } from "../components/ClientForm";
import { Modal } from "../components/Modal";

const statusLabel: Record<Client["onboardingStatus"], string> = {
  PENDING_DVLA: "Pending DVLA",
  APPROVED: "Approved",
};

export function ClientsListPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    setClients(await api.listClients());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Clients</h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + Add client
        </button>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : clients.length === 0 ? (
        <p className="empty-state">No clients yet. Add your first one to get started.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Company</th>
              <th>OL number</th>
              <th>Onboarding</th>
              <th>Vehicles</th>
              <th>Drivers</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/clients/${c.id}`}>{c.companyName}</Link>
                </td>
                <td>{c.olNumber ?? "—"}</td>
                <td>
                  <span className={`badge badge-${c.onboardingStatus.toLowerCase()}`}>
                    {statusLabel[c.onboardingStatus]}
                  </span>
                </td>
                <td>{c._count?.vehicles ?? 0}</td>
                <td>{c._count?.drivers ?? 0}</td>
                <td>{c.contactName ?? c.contactEmail ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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
