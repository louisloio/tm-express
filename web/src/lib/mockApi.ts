import {
  Api,
  Client,
  ClientInput,
  Driver,
  DriverInput,
  OcrsScore,
  OcrsScoreInput,
  Vehicle,
  VehicleInput,
} from "./types";

// Static-demo backend for the GitHub Pages build: no server, no real client
// data — everything lives in this browser's localStorage. Fictional company,
// deliberately distinct from the real seeded PR PROTRANS client so nobody
// mistakes the public demo for real compliance data.

interface Store {
  clients: Client[];
  vehicles: Vehicle[];
  drivers: Driver[];
  ocrsScores: OcrsScore[];
}

const STORAGE_KEY = "tm-express-demo-store-v1";
let nextId = 1000;
const id = () => `demo-${nextId++}`;
const nowIso = () => new Date().toISOString();

function seed(): Store {
  const now = nowIso();

  const acme = "demo-client-1";
  const meridian = "demo-client-2";
  const coastal = "demo-client-3";
  const northbridge = "demo-client-4";

  return {
    clients: [
      {
        id: acme,
        companyName: "Acme Haulage Ltd",
        companyNumber: "09876543",
        vatNumber: "GB 123 4567 89",
        olNumber: "OF1234567",
        address: "1 Depot Road, Manchester, M1 2AB",
        operatingCentreAddress: "Unit 4, Trafford Park Industrial Estate, Manchester, M17 1AB",
        phone: "01611234567",
        website: "acmehaulage.example",
        contactName: "Sam Rivera",
        contactEmail: "sam@acmehaulage.example",
        onboardingStatus: "APPROVED",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: meridian,
        companyName: "Meridian Logistics Group",
        companyNumber: "11223344",
        vatNumber: null,
        olNumber: null,
        address: "22 Harbour Way, Bristol, BS1 6XN",
        operatingCentreAddress: "Meridian Yard, Avonmouth, Bristol, BS11 9YA",
        phone: "01173456789",
        website: null,
        contactName: "Alex Turner",
        contactEmail: "alex@meridianlogistics.example",
        // Still going through DVLA — one vehicle, one driver, most
        // documents not collected yet.
        onboardingStatus: "PENDING_DVLA",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: coastal,
        companyName: "Coastal Freight Solutions",
        companyNumber: "22334455",
        vatNumber: "GB 987 6543 21",
        olNumber: "OF7654321",
        address: "8 Portside Ave, Southampton, SO14 3AB",
        operatingCentreAddress: "Coastal Depot, Millbrook Road East, Southampton, SO15 1HG",
        phone: "02381234567",
        website: "coastalfreight.example",
        contactName: "Morgan Lee",
        contactEmail: "morgan@coastalfreight.example",
        // Established client, but chasing has fallen behind — the largest
        // fleet in the demo and the one with the most gaps.
        onboardingStatus: "APPROVED",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: northbridge,
        companyName: "Northbridge Transport",
        companyNumber: "33445566",
        vatNumber: "GB 456 7890 12",
        olNumber: "OF2223344",
        address: "5 Bridge Street, Leeds, LS1 4HT",
        operatingCentreAddress: "Northbridge Yard, Stourton, Leeds, LS10 1SE",
        phone: "01132345678",
        website: "northbridgetransport.example",
        contactName: "Casey Kim",
        contactEmail: "casey@northbridgetransport.example",
        // Small, tidy operation — everything current, shown for contrast
        // against Coastal Freight's overdue items.
        onboardingStatus: "APPROVED",
        createdAt: now,
        updatedAt: now,
      },
    ],
    vehicles: [
      {
        id: "demo-vehicle-1",
        clientId: acme,
        registration: "AB19 CDE",
        type: "Rigid HGV",
        pmiDueDate: "2026-10-15",
        brakeTestDueDate: "2026-11-01",
        ebpmsFlag: false,
        motDueDate: "2026-08-01",
        vedDueDate: "2026-12-01",
        insuranceDueDate: "2027-01-15",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "demo-vehicle-2",
        clientId: acme,
        registration: "XY68 FGH",
        type: "Artic tractor",
        pmiDueDate: "2026-12-20",
        brakeTestDueDate: null,
        ebpmsFlag: true,
        motDueDate: "2027-02-10",
        vedDueDate: "2026-09-30",
        insuranceDueDate: "2027-01-15",
        createdAt: now,
        updatedAt: now,
      },
      // Meridian — one vehicle, onboarding still in progress, so almost
      // nothing has been collected yet beyond the registration itself.
      {
        id: "demo-vehicle-3",
        clientId: meridian,
        registration: "LM21 KPX",
        type: "Rigid HGV",
        pmiDueDate: null,
        brakeTestDueDate: null,
        ebpmsFlag: false,
        motDueDate: null,
        vedDueDate: null,
        insuranceDueDate: null,
        createdAt: now,
        updatedAt: now,
      },
      // Coastal — four vehicles, a deliberate mix of overdue, missing, and
      // current documents to show a client who needs chasing.
      {
        id: "demo-vehicle-4",
        clientId: coastal,
        registration: "CF15 UVW",
        type: "Rigid HGV",
        pmiDueDate: "2026-07-01",
        brakeTestDueDate: "2026-08-15",
        ebpmsFlag: false,
        motDueDate: "2026-06-20",
        vedDueDate: "2026-07-30",
        insuranceDueDate: "2026-08-01",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "demo-vehicle-5",
        clientId: coastal,
        registration: "CF16 XYZ",
        type: "Artic tractor",
        pmiDueDate: "2026-11-10",
        brakeTestDueDate: null,
        ebpmsFlag: true,
        motDueDate: "2027-01-05",
        vedDueDate: "2026-12-12",
        insuranceDueDate: "2027-02-01",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "demo-vehicle-6",
        clientId: coastal,
        registration: "CF17 RST",
        type: "Rigid HGV",
        pmiDueDate: null,
        brakeTestDueDate: "2026-07-20",
        ebpmsFlag: false,
        motDueDate: "2027-03-01",
        vedDueDate: null,
        insuranceDueDate: "2026-10-01",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "demo-vehicle-7",
        clientId: coastal,
        registration: "CF18 LMN",
        type: "Box van",
        pmiDueDate: null,
        brakeTestDueDate: null,
        ebpmsFlag: false,
        motDueDate: null,
        vedDueDate: null,
        insuranceDueDate: null,
        createdAt: now,
        updatedAt: now,
      },
      // Northbridge — two vehicles, everything comfortably current.
      {
        id: "demo-vehicle-8",
        clientId: northbridge,
        registration: "NB22 ABC",
        type: "Rigid HGV",
        pmiDueDate: "2027-01-10",
        brakeTestDueDate: "2027-01-20",
        ebpmsFlag: false,
        motDueDate: "2027-04-01",
        vedDueDate: "2027-03-15",
        insuranceDueDate: "2027-05-01",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "demo-vehicle-9",
        clientId: northbridge,
        registration: "NB22 DEF",
        type: "Artic tractor",
        pmiDueDate: "2027-02-05",
        brakeTestDueDate: null,
        ebpmsFlag: true,
        motDueDate: "2027-06-01",
        vedDueDate: "2027-04-20",
        insuranceDueDate: "2027-05-01",
        createdAt: now,
        updatedAt: now,
      },
    ],
    drivers: [
      {
        id: "demo-driver-1",
        clientId: acme,
        name: "Jordan Blake",
        licenceCheckDueDate: "2027-03-01",
        cpcDueDate: "2028-06-15",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "demo-driver-2",
        clientId: acme,
        name: "Priya Nair",
        licenceCheckDueDate: "2026-09-01",
        cpcDueDate: "2028-01-20",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "demo-driver-3",
        clientId: meridian,
        name: "Alex Turner",
        licenceCheckDueDate: null,
        cpcDueDate: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "demo-driver-4",
        clientId: coastal,
        name: "Morgan Lee",
        licenceCheckDueDate: "2026-07-01",
        cpcDueDate: "2026-08-10",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "demo-driver-5",
        clientId: coastal,
        name: "Taylor Reed",
        licenceCheckDueDate: "2027-02-01",
        cpcDueDate: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "demo-driver-6",
        clientId: coastal,
        name: "Jamie Fox",
        licenceCheckDueDate: null,
        cpcDueDate: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "demo-driver-7",
        clientId: northbridge,
        name: "Casey Kim",
        licenceCheckDueDate: "2027-05-01",
        cpcDueDate: "2028-03-01",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "demo-driver-8",
        clientId: northbridge,
        name: "Drew Patel",
        licenceCheckDueDate: "2027-06-15",
        cpcDueDate: "2028-04-10",
        createdAt: now,
        updatedAt: now,
      },
    ],
    ocrsScores: [
      {
        id: "demo-ocrs-1",
        clientId: acme,
        dateRecorded: "2026-06-01",
        roadworthinessScore: 8,
        trafficScore: 3,
        band: "GREEN",
        createdAt: now,
      },
      {
        id: "demo-ocrs-2",
        clientId: acme,
        dateRecorded: "2026-08-01",
        roadworthinessScore: 22,
        trafficScore: 3,
        band: "AMBER",
        createdAt: now,
      },
      // Coastal — a worsening run across three entries, ending in Red.
      {
        id: "demo-ocrs-3",
        clientId: coastal,
        dateRecorded: "2026-04-01",
        roadworthinessScore: 15,
        trafficScore: 5,
        band: "AMBER",
        createdAt: now,
      },
      {
        id: "demo-ocrs-4",
        clientId: coastal,
        dateRecorded: "2026-06-01",
        roadworthinessScore: 28,
        trafficScore: 9,
        band: "AMBER",
        createdAt: now,
      },
      {
        id: "demo-ocrs-5",
        clientId: coastal,
        dateRecorded: "2026-08-01",
        roadworthinessScore: 41,
        trafficScore: 12,
        band: "RED",
        createdAt: now,
      },
      // Northbridge — a single steady Green reading.
      {
        id: "demo-ocrs-6",
        clientId: northbridge,
        dateRecorded: "2026-07-01",
        roadworthinessScore: 5,
        trafficScore: 1,
        band: "GREEN",
        createdAt: now,
      },
    ],
  };
}

function load(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    // fall through to reseeding
  }
  const fresh = seed();
  save(fresh);
  return fresh;
}

function save(store: Store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // localStorage unavailable (private browsing, etc.) — demo still works
    // for the current page load, just won't persist across reloads.
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function notFound(resource: string, resourceId: string): never {
  throw new Error(`${resource} ${resourceId} not found`);
}

export const mockApi: Api = {
  async listClients() {
    const store = load();
    return clone(
      store.clients
        .map((c) => ({
          ...c,
          _count: {
            vehicles: store.vehicles.filter((v) => v.clientId === c.id).length,
            drivers: store.drivers.filter((d) => d.clientId === c.id).length,
          },
        }))
        .sort((a, b) => a.companyName.localeCompare(b.companyName))
    );
  },

  async getClient(clientId) {
    const store = load();
    const client = store.clients.find((c) => c.id === clientId);
    if (!client) notFound("Client", clientId);
    return clone({
      ...client,
      vehicles: store.vehicles
        .filter((v) => v.clientId === clientId)
        .sort((a, b) => a.registration.localeCompare(b.registration)),
      drivers: store.drivers
        .filter((d) => d.clientId === clientId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    });
  },

  async createClient(data) {
    const store = load();
    const now = nowIso();
    const client: Client = {
      id: id(),
      companyName: data.companyName ?? "",
      companyNumber: data.companyNumber ?? null,
      vatNumber: data.vatNumber ?? null,
      olNumber: data.olNumber ?? null,
      address: data.address ?? null,
      operatingCentreAddress: data.operatingCentreAddress ?? null,
      phone: data.phone ?? null,
      website: data.website ?? null,
      contactName: data.contactName ?? null,
      contactEmail: data.contactEmail ?? null,
      onboardingStatus: data.onboardingStatus ?? "PENDING_DVLA",
      createdAt: now,
      updatedAt: now,
    };
    store.clients.push(client);
    save(store);
    return clone(client);
  },

  async updateClient(clientId, data) {
    const store = load();
    const client = store.clients.find((c) => c.id === clientId);
    if (!client) notFound("Client", clientId);
    Object.assign(client, data, { updatedAt: nowIso() });
    save(store);
    return clone(client);
  },

  async deleteClient(clientId) {
    const store = load();
    store.clients = store.clients.filter((c) => c.id !== clientId);
    store.vehicles = store.vehicles.filter((v) => v.clientId !== clientId);
    store.drivers = store.drivers.filter((d) => d.clientId !== clientId);
    store.ocrsScores = store.ocrsScores.filter((s) => s.clientId !== clientId);
    save(store);
  },

  async createVehicle(clientId, data) {
    const store = load();
    if (!store.clients.some((c) => c.id === clientId)) notFound("Client", clientId);
    const now = nowIso();
    const vehicle: Vehicle = {
      id: id(),
      clientId,
      registration: data.registration ?? "",
      type: data.type ?? null,
      pmiDueDate: data.pmiDueDate ?? null,
      brakeTestDueDate: data.brakeTestDueDate ?? null,
      ebpmsFlag: data.ebpmsFlag ?? false,
      motDueDate: data.motDueDate ?? null,
      vedDueDate: data.vedDueDate ?? null,
      insuranceDueDate: data.insuranceDueDate ?? null,
      createdAt: now,
      updatedAt: now,
    };
    store.vehicles.push(vehicle);
    save(store);
    return clone(vehicle);
  },

  async updateVehicle(vehicleId, data: Partial<VehicleInput>) {
    const store = load();
    const vehicle = store.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) notFound("Vehicle", vehicleId);
    Object.assign(vehicle, data, { updatedAt: nowIso() });
    save(store);
    return clone(vehicle);
  },

  async deleteVehicle(vehicleId) {
    const store = load();
    store.vehicles = store.vehicles.filter((v) => v.id !== vehicleId);
    save(store);
  },

  async createDriver(clientId, data) {
    const store = load();
    if (!store.clients.some((c) => c.id === clientId)) notFound("Client", clientId);
    const now = nowIso();
    const driver: Driver = {
      id: id(),
      clientId,
      name: data.name ?? "",
      licenceCheckDueDate: data.licenceCheckDueDate ?? null,
      cpcDueDate: data.cpcDueDate ?? null,
      createdAt: now,
      updatedAt: now,
    };
    store.drivers.push(driver);
    save(store);
    return clone(driver);
  },

  async updateDriver(driverId, data: Partial<DriverInput>) {
    const store = load();
    const driver = store.drivers.find((d) => d.id === driverId);
    if (!driver) notFound("Driver", driverId);
    Object.assign(driver, data, { updatedAt: nowIso() });
    save(store);
    return clone(driver);
  },

  async deleteDriver(driverId) {
    const store = load();
    store.drivers = store.drivers.filter((d) => d.id !== driverId);
    save(store);
  },

  async listOcrsScores(clientId) {
    const store = load();
    return clone(
      store.ocrsScores
        .filter((s) => s.clientId === clientId)
        .sort((a, b) => a.dateRecorded.localeCompare(b.dateRecorded))
    );
  },

  async createOcrsScore(clientId, data) {
    const store = load();
    if (!store.clients.some((c) => c.id === clientId)) notFound("Client", clientId);
    const score: OcrsScore = {
      id: id(),
      clientId,
      dateRecorded: data.dateRecorded ?? nowIso(),
      roadworthinessScore: data.roadworthinessScore ?? 0,
      trafficScore: data.trafficScore ?? 0,
      band: data.band ?? "GREEN",
      createdAt: nowIso(),
    };
    store.ocrsScores.push(score);
    save(store);
    return clone(score);
  },

  async updateOcrsScore(scoreId, data: Partial<OcrsScoreInput>) {
    const store = load();
    const score = store.ocrsScores.find((s) => s.id === scoreId);
    if (!score) notFound("OcrsScore", scoreId);
    Object.assign(score, data);
    save(store);
    return clone(score);
  },

  async deleteOcrsScore(scoreId) {
    const store = load();
    store.ocrsScores = store.ocrsScores.filter((s) => s.id !== scoreId);
    save(store);
  },
};

// Not part of the Api interface — used only by the demo banner to let
// visitors reset back to the seeded starting point.
export function resetDemoStore() {
  localStorage.removeItem(STORAGE_KEY);
}
