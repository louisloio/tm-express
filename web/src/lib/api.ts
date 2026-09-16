export type OnboardingStatus = "PENDING_DVLA" | "APPROVED";

export type ComplianceStatus = "GREEN" | "AMBER" | "RED" | "ONBOARDING";

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
  complianceStatus?: ComplianceStatus;
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

export type DocumentType =
  | "PMI"
  | "BRAKE_TEST"
  | "MOT"
  | "VED"
  | "INSURANCE"
  | "LICENCE_CHECK"
  | "CPC"
  | "INFRINGEMENT_REPORT"
  | "DEPOT_VISIT_NOTE"
  | "OTHER";

export interface Document {
  id: string;
  clientId: string;
  vehicleId: string | null;
  driverId: string | null;
  type: DocumentType;
  fileName: string;
  filePath: string;
  uploadDate: string;
  validUntil: string | null;
  createdAt: string;
}

export type FollowUpStatus = "NONE" | "OPEN" | "RESOLVED";

export interface DepotVisit {
  id: string;
  clientId: string;
  date: string;
  findings: string | null;
  actionsAgreed: string | null;
  owner: string | null;
  followUpStatus: FollowUpStatus;
  createdAt: string;
  updatedAt: string;
}

export type DepotVisitInput = Omit<DepotVisit, "id" | "clientId" | "createdAt" | "updatedAt">;

export type TodoType =
  | "MISSING_DOCUMENT"
  | "OVERDUE_DOCUMENT"
  | "VISIT_OVERDUE"
  | "ONBOARDING_STEP"
  | "OCRS_MOVEMENT"
  | "INFRINGEMENT";

export type TodoStatus = "OPEN" | "RESOLVED";

export interface Todo {
  id: string;
  type: TodoType;
  documentType: DocumentType | null;
  description: string;
  clientId: string;
  vehicleId: string | null;
  driverId: string | null;
  depotVisitId: string | null;
  status: TodoStatus;
  createdAt: string;
  resolvedAt: string | null;
  client?: { companyName: string };
}

export interface DashboardClient {
  id: string;
  companyName: string;
  onboardingStatus: OnboardingStatus;
  complianceStatus: ComplianceStatus;
  vehicleCount: number;
  driverCount: number;
  lastVisitDate: string | null;
  lastPmiDate: string | null;
  lastBrakeTestDate: string | null;
  latestOcrsBand: OcrsBand | null;
}

export interface DashboardDriver {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  licenceCheckDueDate: string | null;
  cpcDueDate: string | null;
}

export interface Dashboard {
  clients: DashboardClient[];
  drivers: DashboardDriver[];
}

export type EmailConnectionStatus = "UNTESTED" | "CONNECTED" | "ERROR";

export interface EmailAccount {
  id: string;
  label: string;
  imapHost: string;
  imapPort: number;
  imapUsername: string;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpSecure: boolean;
  connectionStatus: EmailConnectionStatus;
  connectionError: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
}

export interface EmailAccountInput {
  label: string;
  imapHost: string;
  imapPort: number;
  imapUsername: string;
  imapPassword: string;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpSecure: boolean;
}

export interface MessagePreview {
  uid: number;
  subject: string;
  from: string;
  date: string | null;
}

export interface MessageSummary extends MessagePreview {
  hasAttachments: boolean;
}

export interface MessageAttachment {
  index: number;
  filename: string;
  contentType: string;
  size: number;
}

export interface MessageDetail {
  uid: number;
  subject: string;
  from: string;
  to: string;
  date: string | null;
  text: string | null;
  html: string | null;
  attachments: MessageAttachment[];
}

export type TestConnectionResult =
  | { ok: true; preview: MessagePreview[] }
  | { ok: false; error: string };

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

  listDocuments: (clientId: string) => request<Document[]>(`/clients/${clientId}/documents`),
  uploadDocument: async (
    clientId: string,
    data: { type: DocumentType; vehicleId?: string | null; driverId?: string | null; validUntil?: string | null; file: File }
  ) => {
    const form = new FormData();
    form.append("type", data.type);
    if (data.vehicleId) form.append("vehicleId", data.vehicleId);
    if (data.driverId) form.append("driverId", data.driverId);
    if (data.validUntil) form.append("validUntil", data.validUntil);
    form.append("file", data.file);
    const res = await fetch(`/api/clients/${clientId}/documents`, { method: "POST", body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.error ?? res.statusText);
    }
    return res.json() as Promise<Document>;
  },
  documentFileUrl: (id: string) => `/api/documents/${id}/file`,
  deleteDocument: (id: string) => request<void>(`/documents/${id}`, { method: "DELETE" }),

  listDepotVisits: (clientId: string) => request<DepotVisit[]>(`/clients/${clientId}/depot-visits`),
  createDepotVisit: (clientId: string, data: Partial<DepotVisitInput>) =>
    request<DepotVisit>(`/clients/${clientId}/depot-visits`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateDepotVisit: (id: string, data: Partial<DepotVisitInput>) =>
    request<DepotVisit>(`/depot-visits/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDepotVisit: (id: string) => request<void>(`/depot-visits/${id}`, { method: "DELETE" }),

  listTodos: (clientId: string) => request<Todo[]>(`/clients/${clientId}/todos`),
  listAllTodos: () => request<Todo[]>("/todos"),
  resolveTodo: (id: string) => request<Todo>(`/todos/${id}/resolve`, { method: "POST" }),

  getDashboard: () => request<Dashboard>("/dashboard"),

  listEmailAccounts: () => request<EmailAccount[]>("/email-accounts"),
  testEmailAccount: (data: EmailAccountInput) =>
    request<TestConnectionResult>("/email-accounts/test", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createEmailAccount: (data: EmailAccountInput) =>
    request<EmailAccount>("/email-accounts", { method: "POST", body: JSON.stringify(data) }),
  deleteEmailAccount: (id: string) => request<void>(`/email-accounts/${id}`, { method: "DELETE" }),
  listEmailMessages: (accountId: string) =>
    request<MessageSummary[]>(`/email-accounts/${accountId}/messages`),
  getEmailMessage: (accountId: string, uid: number) =>
    request<MessageDetail>(`/email-accounts/${accountId}/messages/${uid}`),
  emailAttachmentUrl: (accountId: string, uid: number, index: number) =>
    `/api/email-accounts/${accountId}/messages/${uid}/attachments/${index}`,
};
