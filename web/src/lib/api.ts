import { Api, Client, ClientDetail, ClientInput, Driver, DriverInput, OcrsScore, OcrsScoreInput, Vehicle, VehicleInput } from "./types";
import { mockApi } from "./mockApi";

export * from "./types";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const realApi: Api = {
  listClients: () => request<Client[]>("/clients"),
  getClient: (id: string) => request<ClientDetail>(`/clients/${id}`),
  createClient: (data: Partial<ClientInput>) =>
    request<Client>("/clients", { method: "POST", body: JSON.stringify(data) }),
  updateClient: (id: string, data: Partial<ClientInput>) =>
    request<Client>(`/clients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteClient: (id: string) => request<void>(`/clients/${id}`, { method: "DELETE" }),

  createVehicle: (clientId: string, data: Partial<VehicleInput>) =>
    request<Vehicle>(`/clients/${clientId}/vehicles`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateVehicle: (id: string, data: Partial<VehicleInput>) =>
    request<Vehicle>(`/vehicles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteVehicle: (id: string) => request<void>(`/vehicles/${id}`, { method: "DELETE" }),

  createDriver: (clientId: string, data: Partial<DriverInput>) =>
    request<Driver>(`/clients/${clientId}/drivers`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateDriver: (id: string, data: Partial<DriverInput>) =>
    request<Driver>(`/drivers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDriver: (id: string) => request<void>(`/drivers/${id}`, { method: "DELETE" }),

  listOcrsScores: (clientId: string) =>
    request<OcrsScore[]>(`/clients/${clientId}/ocrs-scores`),
  createOcrsScore: (clientId: string, data: Partial<OcrsScoreInput>) =>
    request<OcrsScore>(`/clients/${clientId}/ocrs-scores`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateOcrsScore: (id: string, data: Partial<OcrsScoreInput>) =>
    request<OcrsScore>(`/ocrs-scores/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteOcrsScore: (id: string) => request<void>(`/ocrs-scores/${id}`, { method: "DELETE" }),
};

// The GitHub Pages build (npm run build:demo, VITE_DEMO_MODE=true) has no
// backend to call, so it runs entirely against localStorage-backed sample
// data instead. Everywhere else (npm run dev, a real deployment) talks to
// the real Express API.
export const api: Api = import.meta.env.VITE_DEMO_MODE === "true" ? mockApi : realApi;

export const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";
