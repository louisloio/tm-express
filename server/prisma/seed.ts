import { PrismaClient } from "@prisma/client";
import { syncTodosForClient } from "../src/lib/todoSync";

const prisma = new PrismaClient();

async function main() {
  let client = await prisma.client.findFirst({
    where: { companyName: "PR PROTRANS LTD" },
  });

  const clientData = {
    companyName: "PR PROTRANS LTD",
    companyNumber: "12338165",
    vatNumber: "343 0958 02",
    // Seed note: the "Request for O Licence Documentation" email thread references
    // OK2049916 instead — unconfirmed, flagged for follow-up with the client.
    olNumber: "OF2068326",
    address: "128 Amyand Park Road, Twickenham, TW1 3HP",
    operatingCentreAddress:
      "Plot 13, Court Lane Industrial Estate, Court Lane, Iver, SL0 9HL (3 vehicles, 2 trailers)",
    phone: "07383017550",
    website: "prprotrans.co.uk",
    contactName: "Piotr",
    contactEmail: "office@prprotrans.co.uk",
    onboardingStatus: "APPROVED" as const,
  };

  if (client) {
    client = await prisma.client.update({ where: { id: client.id }, data: clientData });
  } else {
    client = await prisma.client.create({ data: clientData });
  }

  const vehicles = [
    {
      registration: "FN68 HWJ",
      type: "Rigid HGV",
      motDueDate: new Date("2025-06-30"),
      vedDueDate: new Date("2025-12-01"),
    },
    {
      registration: "BN68 GLF",
      type: "Rigid HGV",
    },
    {
      registration: "MV74 FEP",
      type: "Rigid HGV with tail lift (LOLER-tested lifting equipment)",
    },
  ];

  for (const vehicle of vehicles) {
    await prisma.vehicle.upsert({
      where: {
        clientId_registration: { clientId: client.id, registration: vehicle.registration },
      },
      update: vehicle,
      create: { ...vehicle, clientId: client.id },
    });
  }

  const drivers = [
    { name: "Charles Okura" },
    // Identity unconfirmed: eyesight/fit-to-drive docs are labelled "GI", the
    // eyesight check sheet is labelled "AS" — seeded as separate placeholders
    // pending confirmation with the client of who these actually are.
    { name: "Driver GI (identity unconfirmed)" },
    { name: "Driver AS (identity unconfirmed)" },
  ];

  for (const driver of drivers) {
    const existing = await prisma.driver.findFirst({
      where: { clientId: client.id, name: driver.name },
    });
    if (!existing) {
      await prisma.driver.create({ data: { ...driver, clientId: client.id } });
    }
  }

  await syncTodosForClient(client.id);

  console.log(`Seeded client ${client.companyName} (${client.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
