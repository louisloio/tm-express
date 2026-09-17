import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ClientDetail, Driver, OcrsScore, Vehicle } from "../lib/api";
import { ClientForm } from "../components/ClientForm";
import { VehicleForm } from "../components/VehicleForm";
import { DriverForm } from "../components/DriverForm";
import { OcrsScoreForm } from "../components/OcrsScoreForm";
import { Modal } from "../components/Modal";
import { formatDate, isOverdue } from "../lib/dates";
import { bandLabel, compareToPrevious } from "../lib/ocrs";
import { computeClientTodos } from "../lib/todos";
import { TodoList } from "../components/TodoList";

type VehicleModal = { mode: "add" } | { mode: "edit"; vehicle: Vehicle } | null;
type DriverModal = { mode: "add" } | { mode: "edit"; driver: Driver } | null;
type OcrsModal = { mode: "add" } | { mode: "edit"; score: OcrsScore } | null;

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [ocrsScores, setOcrsScores] = useState<OcrsScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState(false);
  const [vehicleModal, setVehicleModal] = useState<VehicleModal>(null);
  const [driverModal, setDriverModal] = useState<DriverModal>(null);
  const [ocrsModal, setOcrsModal] = useState<OcrsModal>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    const [clientData, scores] = await Promise.all([
      api.getClient(id),
      api.listOcrsScores(id),
    ]);
    setClient(clientData);
    setOcrsScores(scores);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div className="page">Loading…</div>;
  if (!client) return <div className="page">Client not found.</div>;

  async function handleDeleteClient() {
    if (!client) return;
    if (!confirm(`Delete ${client.companyName}? This removes all their vehicles and drivers.`))
      return;
    await api.deleteClient(client.id);
    navigate("/");
  }

  async function handleDeleteVehicle(vehicle: Vehicle) {
    if (!confirm(`Delete vehicle ${vehicle.registration}?`)) return;
    await api.deleteVehicle(vehicle.id);
    await load();
  }

  async function handleDeleteDriver(driver: Driver) {
    if (!confirm(`Delete driver ${driver.name}?`)) return;
    await api.deleteDriver(driver.id);
    await load();
  }

  async function handleDeleteOcrsScore(score: OcrsScore) {
    if (!confirm(`Delete the OCRS entry dated ${formatDate(score.dateRecorded)}?`)) return;
    await api.deleteOcrsScore(score.id);
    await load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/" className="back-link">
            ← All clients
          </Link>
          <h1>{client.companyName}</h1>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => setEditingClient(true)}>
            Edit client
          </button>
          <button className="btn btn-danger" onClick={handleDeleteClient}>
            Delete client
          </button>
        </div>
      </div>

      <section className="card">
        <h2>Client details</h2>
        <dl className="detail-grid">
          <div>
            <dt>OL number</dt>
            <dd>{client.olNumber ?? "—"}</dd>
          </div>
          <div>
            <dt>Company number</dt>
            <dd>{client.companyNumber ?? "—"}</dd>
          </div>
          <div>
            <dt>VAT number</dt>
            <dd>{client.vatNumber ?? "—"}</dd>
          </div>
          <div>
            <dt>Onboarding status</dt>
            <dd>
              <span className={`badge badge-${client.onboardingStatus.toLowerCase()}`}>
                {client.onboardingStatus === "APPROVED" ? "Approved" : "Pending DVLA"}
              </span>
            </dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd>
              {client.contactName ?? "—"}
              {client.contactEmail ? ` · ${client.contactEmail}` : ""}
            </dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{client.phone ?? "—"}</dd>
          </div>
          <div>
            <dt>Website</dt>
            <dd>{client.website ?? "—"}</dd>
          </div>
          <div className="span-2">
            <dt>Registered address</dt>
            <dd>{client.address ?? "—"}</dd>
          </div>
          <div className="span-2">
            <dt>Operating centre</dt>
            <dd>{client.operatingCentreAddress ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <h2>Todo ({computeClientTodos(client, client.vehicles, client.drivers, ocrsScores).length})</h2>
        <TodoList todos={computeClientTodos(client, client.vehicles, client.drivers, ocrsScores)} />
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Vehicles ({client.vehicles.length})</h2>
          <button className="btn btn-primary" onClick={() => setVehicleModal({ mode: "add" })}>
            + Add vehicle
          </button>
        </div>
        {client.vehicles.length === 0 ? (
          <p className="empty-state">No vehicles yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Registration</th>
                <th>Type</th>
                <th>MOT due</th>
                <th>VED due</th>
                <th>Insurance due</th>
                <th>PMI due</th>
                <th>Brake test due</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {client.vehicles.map((v) => (
                <tr key={v.id}>
                  <td>{v.registration}</td>
                  <td>{v.type ?? "—"}</td>
                  <td className={isOverdue(v.motDueDate) ? "overdue" : ""}>
                    {formatDate(v.motDueDate)}
                  </td>
                  <td className={isOverdue(v.vedDueDate) ? "overdue" : ""}>
                    {formatDate(v.vedDueDate)}
                  </td>
                  <td className={isOverdue(v.insuranceDueDate) ? "overdue" : ""}>
                    {formatDate(v.insuranceDueDate)}
                  </td>
                  <td className={isOverdue(v.pmiDueDate) ? "overdue" : ""}>
                    {formatDate(v.pmiDueDate)}
                  </td>
                  <td className={isOverdue(v.brakeTestDueDate) ? "overdue" : ""}>
                    {v.ebpmsFlag ? "EBPMS" : formatDate(v.brakeTestDueDate)}
                  </td>
                  <td className="row-actions">
                    <button
                      className="link-btn"
                      onClick={() => setVehicleModal({ mode: "edit", vehicle: v })}
                    >
                      Edit
                    </button>
                    <button className="link-btn danger" onClick={() => handleDeleteVehicle(v)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Drivers ({client.drivers.length})</h2>
          <button className="btn btn-primary" onClick={() => setDriverModal({ mode: "add" })}>
            + Add driver
          </button>
        </div>
        {client.drivers.length === 0 ? (
          <p className="empty-state">No drivers yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Licence check due</th>
                <th>CPC due</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {client.drivers.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td className={isOverdue(d.licenceCheckDueDate) ? "overdue" : ""}>
                    {formatDate(d.licenceCheckDueDate)}
                  </td>
                  <td className={isOverdue(d.cpcDueDate) ? "overdue" : ""}>
                    {formatDate(d.cpcDueDate)}
                  </td>
                  <td className="row-actions">
                    <button
                      className="link-btn"
                      onClick={() => setDriverModal({ mode: "edit", driver: d })}
                    >
                      Edit
                    </button>
                    <button className="link-btn danger" onClick={() => handleDeleteDriver(d)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2>OCRS history ({ocrsScores.length})</h2>
          <button className="btn btn-primary" onClick={() => setOcrsModal({ mode: "add" })}>
            + Add OCRS entry
          </button>
        </div>
        {ocrsScores.length === 0 ? (
          <p className="empty-state">
            No OCRS entries yet. VOL doesn't expose these via API — log in monthly and enter
            what you see.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Roadworthiness</th>
                <th>Traffic</th>
                <th>Band</th>
                <th>Movement</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...ocrsScores]
                .reverse()
                .map((score, i, reversedArr) => {
                  const previous = reversedArr[i + 1] ?? null;
                  const movement = compareToPrevious(score, previous);
                  return (
                    <tr key={score.id}>
                      <td>{formatDate(score.dateRecorded)}</td>
                      <td>{score.roadworthinessScore}</td>
                      <td>{score.trafficScore}</td>
                      <td>
                        <span className={`badge badge-${score.band.toLowerCase()}`}>
                          {bandLabel[score.band]}
                        </span>
                      </td>
                      <td>
                        {movement.worsened ? (
                          <span className="movement-flag" title={movement.reasons.join("; ")}>
                            ▲ Worsened
                          </span>
                        ) : previous ? (
                          "—"
                        ) : (
                          ""
                        )}
                      </td>
                      <td className="row-actions">
                        <button
                          className="link-btn"
                          onClick={() => setOcrsModal({ mode: "edit", score })}
                        >
                          Edit
                        </button>
                        <button
                          className="link-btn danger"
                          onClick={() => handleDeleteOcrsScore(score)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        )}
      </section>

      {editingClient && (
        <Modal title="Edit client" onClose={() => setEditingClient(false)}>
          <ClientForm
            initial={client}
            onSubmit={async (data) => {
              await api.updateClient(client.id, data);
              setEditingClient(false);
              await load();
            }}
            onCancel={() => setEditingClient(false)}
          />
        </Modal>
      )}

      {vehicleModal && (
        <Modal
          title={vehicleModal.mode === "add" ? "Add vehicle" : "Edit vehicle"}
          onClose={() => setVehicleModal(null)}
        >
          <VehicleForm
            initial={vehicleModal.mode === "edit" ? vehicleModal.vehicle : undefined}
            onSubmit={async (data) => {
              if (vehicleModal.mode === "add") {
                await api.createVehicle(client.id, data);
              } else {
                await api.updateVehicle(vehicleModal.vehicle.id, data);
              }
              setVehicleModal(null);
              await load();
            }}
            onCancel={() => setVehicleModal(null)}
          />
        </Modal>
      )}

      {driverModal && (
        <Modal
          title={driverModal.mode === "add" ? "Add driver" : "Edit driver"}
          onClose={() => setDriverModal(null)}
        >
          <DriverForm
            initial={driverModal.mode === "edit" ? driverModal.driver : undefined}
            onSubmit={async (data) => {
              if (driverModal.mode === "add") {
                await api.createDriver(client.id, data);
              } else {
                await api.updateDriver(driverModal.driver.id, data);
              }
              setDriverModal(null);
              await load();
            }}
            onCancel={() => setDriverModal(null)}
          />
        </Modal>
      )}

      {ocrsModal && (
        <Modal
          title={ocrsModal.mode === "add" ? "Add OCRS entry" : "Edit OCRS entry"}
          onClose={() => setOcrsModal(null)}
        >
          <OcrsScoreForm
            initial={ocrsModal.mode === "edit" ? ocrsModal.score : undefined}
            onSubmit={async (data) => {
              if (ocrsModal.mode === "add") {
                await api.createOcrsScore(client.id, data);
              } else {
                await api.updateOcrsScore(ocrsModal.score.id, data);
              }
              setOcrsModal(null);
              await load();
            }}
            onCancel={() => setOcrsModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}
