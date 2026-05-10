import { Router } from "express";
import { servicesController } from "./services.controller.js";

export const servicesRouter = Router();

servicesRouter.get("/", servicesController.list);
servicesRouter.post("/", servicesController.create);
servicesRouter.put("/:id", servicesController.update);
servicesRouter.delete("/:id", servicesController.remove);