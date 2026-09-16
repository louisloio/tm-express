import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { NotFoundError } from "../lib/errors";

// Nested under a client: /api/clients/:clientId/todos
export const nestedTodoRouter = Router({ mergeParams: true });

nestedTodoRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { clientId } = req.params as { clientId: string };
    const status = req.query.status === "all" ? undefined : "OPEN";
    const todos = await prisma.todo.findMany({
      where: { clientId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
    });
    res.json(todos);
  })
);

// All-clients view: /api/todos
export const todoRouter = Router();

todoRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status === "all" ? undefined : "OPEN";
    const todos = await prisma.todo.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: "desc" },
      include: { client: { select: { companyName: true } } },
    });
    res.json(todos);
  })
);

// Manual resolve — for todo types the automatic sync doesn't cover
// (e.g. OCRS_MOVEMENT), per spec section 8's "Enter/upload manually" action.
todoRouter.post(
  "/:id/resolve",
  asyncHandler(async (req, res) => {
    const existing = await prisma.todo.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Todo", req.params.id);
    const todo = await prisma.todo.update({
      where: { id: req.params.id },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    res.json(todo);
  })
);
