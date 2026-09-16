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

export type ClientInput = Omit<Client, "id" | "createdAt" | "updatedAt" | "_count">;

export type VehicleInput = Omit<Vehicle, "id" | "clientId" | "createdAt" | "updatedAt">;

export type DriverInput = Omit<Driver, "id" | "clientId" | "createdAt" | "updatedAt">;

export type OcrsScoreInput = Omit<OcrsScore, "id" | "clientId" | "createdAt">;

export interface Api {
  listClients: () => Promise<Client[]>;
  getClient: (id: string) => Promise<ClientDetail>;
  createClient: (data: Partial<ClientInput>) => Promise<Client>;
  updateClient: (id: string, data: Partial<ClientInput>) => Promise<Client>;
  deleteClient: (id: string) => Promise<void>;

  createVehicle: (clientId: string, data: Partial<VehicleInput>) => Promise<Vehicle>;
  updateVehicle: (id: string, data: Partial<VehicleInput>) => Promise<Vehicle>;
  deleteVehicle: (id: string) => Promise<void>;

  createDriver: (clientId: string, data: Partial<DriverInput>) => Promise<Driver>;
  updateDriver: (id: string, data: Partial<DriverInput>) => Promise<Driver>;
  deleteDriver: (id: string) => Promise<void>;

  listOcrsScores: (clientId: string) => Promise<OcrsScore[]>;
  createOcrsScore: (clientId: string, data: Partial<OcrsScoreInput>) => Promise<OcrsScore>;
  updateOcrsScore: (id: string, data: Partial<OcrsScoreInput>) => Promise<OcrsScore>;
  deleteOcrsScore: (id: string) => Promise<void>;
}
