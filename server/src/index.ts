import cors from "cors";
import express, { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import clientsRouter from "./routes/clients";
import { nestedVehicleRouter, vehicleByIdRouter } from "./routes/vehicles";
import { nestedDriverRouter, driverByIdRouter } from "./routes/drivers";
import { nestedOcrsScoreRouter, ocrsScoreByIdRouter } from "./routes/ocrsScores";
import { nestedDocumentRouter, documentByIdRouter } from "./routes/documents";
import { nestedDepotVisitRouter, depotVisitByIdRouter } from "./routes/depotVisits";
import { nestedTodoRouter, todoRouter } from "./routes/todos";
import { dashboardRouter } from "./routes/dashboard";
import { emailAccountRouter } from "./routes/emailAccounts";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/dashboard", dashboardRouter);
app.use("/api/todos", todoRouter);
app.use("/api/email-accounts", emailAccountRouter);

app.use("/api/clients/:clientId/vehicles", nestedVehicleRouter);
app.use("/api/clients/:clientId/drivers", nestedDriverRouter);
app.use("/api/clients/:clientId/ocrs-scores", nestedOcrsScoreRouter);
app.use("/api/clients/:clientId/documents", nestedDocumentRouter);
app.use("/api/clients/:clientId/depot-visits", nestedDepotVisitRouter);
app.use("/api/clients/:clientId/todos", nestedTodoRouter);
app.use("/api/clients", clientsRouter);

app.use("/api/vehicles", vehicleByIdRouter);
app.use("/api/drivers", driverByIdRouter);
app.use("/api/ocrs-scores", ocrsScoreByIdRouter);
app.use("/api/documents", documentByIdRouter);
app.use("/api/depot-visits", depotVisitByIdRouter);

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
