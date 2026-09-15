export type OnboardingStatus = "PENDING_DVLA" | "APPROVED";

export interface Client {
  id: string;
  companyName: string;
  companyNumber: string | null;
  vatNumber: string | null;
  olNumber: string | null;
  address: string | null;
  operatingCentreAddress: string | null;
  phone: string | null;
  website: string | null;
  contactName: string | null;
  contactEmail: string | null;
  onboardingStatus: OnboardingStatus;
  createdAt: string;
  updatedAt: string;
  _count?: { vehicles: number; drivers: number };
}

export interface ClientDetail extends Client {
  vehicles: Vehicle[];
  drivers: Driver[];
}

export interface Vehicle {
  id: string;
  clientId: string;
  registration: string;
  type: string | null;
  pmiDueDate: string | null;
  brakeTestDueDate: string | null;
  ebpmsFlag: boolean;
  motDueDate: string | null;
  vedDueDate: string | null;
  insuranceDueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  clientId: string;
  name: string;
  licenceCheckDueDate: string | null;
  cpcDueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OcrsBand = "GREEN" | "AMBER" | "RED" | "GREY" | "BLUE";

export interface OcrsScore {
  id: string;
  clientId: string;
  dateRecorded: string;
  roadworthinessScore: number;
  trafficScore: number;
  band: OcrsBand;
  createdAt: string;
}

export type ClientInput = Omit<
  Client,
  "id" | "createdAt" | "updatedAt" | "_count"
>;

export type VehicleInput = Omit<
  Vehicle,
  "id" | "clientId" | "createdAt" | "updatedAt"
>;

export type DriverInput = Omit<Driver, "id" | "clientId" | "createdAt" | "updatedAt">;

export type OcrsScoreInput = Omit<OcrsScore, "id" | "clientId" | "createdAt">;

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

export const api = {
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
