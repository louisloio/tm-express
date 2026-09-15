import cors from "cors";
import express, { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import clientsRouter from "./routes/clients";
import { nestedVehicleRouter, vehicleByIdRouter } from "./routes/vehicles";
import { nestedDriverRouter, driverByIdRouter } from "./routes/drivers";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/clients/:clientId/vehicles", nestedVehicleRouter);
app.use("/api/clients/:clientId/drivers", nestedDriverRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/vehicles", vehicleByIdRouter);
app.use("/api/drivers", driverByIdRouter);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "ValidationError", issues: err.issues });
    return;
  }
  const status = typeof err?.status === "number" ? err.status : 500;
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({ error: err?.message ?? "Internal Server Error" });
};

app.use(errorHandler);

app.listen(port, () => {
  console.log(`TM Express API listening on http://localhost:${port}`);
});
