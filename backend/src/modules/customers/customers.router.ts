import { Router } from "express";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { customersController } from "./customers.controller.js";

export const customersRouter = Router();

// ─── Read — all staff roles ───────────────────────────────────────────────────
customersRouter.get("/", customersController.list);
customersRouter.get("/:id", customersController.getById);
customersRouter.get("/:id/history", customersController.getHistory);

// ─── Lookup / dedup — all staff roles ────────────────────────────────────────
// POST so we can send phone + email in the body without leaking in query strings
customersRouter.post("/lookup", customersController.lookup);

// ─── Create — all staff including BARBER ─────────────────────────────────────
customersRouter.post(
  "/",
  requireRole("OWNER", "ADMIN", "BARBER", "RECEPTIONIST"),
  customersController.create,
);

// ─── Update — owner / admin / receptionist (NOT barber) ──────────────────────
customersRouter.patch(
  "/:id",
  requireRole("OWNER", "ADMIN", "RECEPTIONIST"),
  customersController.update,
);

// ─── Recalculate stats — owner / admin ───────────────────────────────────────
customersRouter.post(
  "/:id/recalculate-stats",
  requireRole("OWNER", "ADMIN"),
  customersController.recalculateStats,
);

customersRouter.post(
  "/invite-portal",
  requireRole("OWNER", "ADMIN", "BARBER", "RECEPTIONIST"),
  customersController.inviteToPortal,
);

// ─── Soft delete — owner / admin only ────────────────────────────────────────
customersRouter.delete(
  "/:id",
  requireRole("OWNER", "ADMIN"),
  customersController.remove,
);
