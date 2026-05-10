import { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { AppointmentFiltersSchema, CreateAppointmentSchema, UpdateAppointmentSchema } from "./appointments.schema.js";
import { appointmentsService } from "./appointments.service.js";

export const appointmentsController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = req.user?.businessId;
      if (!businessId) {
        throw new AppError("UNAUTHORIZED", 401);
      }

      const filters = AppointmentFiltersSchema.parse(req.query);
      const data = await appointmentsService.list(businessId, filters);

      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = req.user?.businessId;
      if (!businessId) {
        throw new AppError("UNAUTHORIZED", 401);
      }

      const appointment = await appointmentsService.getById(req.params.id, businessId);
      if (!appointment) {
        throw new AppError("APPOINTMENT_NOT_FOUND", 404);
      }

      res.status(200).json(appointment);
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError("UNAUTHORIZED", 401);
      }

      const payload = CreateAppointmentSchema.parse(req.body);
      const result = await appointmentsService.createAppointment(payload, user.id, user.businessId);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError("UNAUTHORIZED", 401);
      }

      const payload = UpdateAppointmentSchema.parse(req.body);
      const result = await appointmentsService.updateAppointment(req.params.id, user.businessId, payload, user.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError("UNAUTHORIZED", 401);
      }

      await appointmentsService.deleteAppointment(req.params.id, user.businessId, user.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};