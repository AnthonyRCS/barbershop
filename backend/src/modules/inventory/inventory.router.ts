import { Router } from "express";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { inventoryController } from "./inventory.controller.js";

export const inventoryRouter = Router();

inventoryRouter.get("/products", inventoryController.listProducts);
inventoryRouter.post("/products", requireRole("OWNER", "ADMIN", "RECEPTIONIST"), inventoryController.createProduct);
inventoryRouter.put("/products/:id", requireRole("OWNER", "ADMIN", "RECEPTIONIST"), inventoryController.updateProduct);
inventoryRouter.delete("/products/:id", requireRole("OWNER", "ADMIN"), inventoryController.deleteProduct);

inventoryRouter.get("/movements", inventoryController.listMovements);
inventoryRouter.post("/movements", requireRole("OWNER", "ADMIN", "RECEPTIONIST"), inventoryController.createMovement);
