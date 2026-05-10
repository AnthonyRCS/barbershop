import { AppError } from "../../lib/errors.js";
import { CreateServiceSchema, UpdateServiceSchema } from "./services.schema.js";
import { servicesRepository } from "./services.repository.js";

export const servicesService = {
  list(businessId: string, search?: string) {
    return servicesRepository.list(businessId, search);
  },
  async create(businessId: string, data: unknown) {
    const payload = CreateServiceSchema.parse(data);
    return servicesRepository.create({ ...payload, businessId, price: payload.price.toString() });
  },
  async update(id: string, businessId: string, data: unknown) {
    const payload = UpdateServiceSchema.parse(data);
    const result = await servicesRepository.update(id, businessId, {
      ...payload,
      price: typeof payload.price === "number" ? payload.price.toString() : undefined,
    });
    if (result.count === 0) throw new AppError("SERVICE_NOT_FOUND", 404);
    return servicesRepository.getById(id, businessId);
  },
  async remove(id: string, businessId: string) {
    const result = await servicesRepository.softDelete(id, businessId);
    if (result.count === 0) throw new AppError("SERVICE_NOT_FOUND", 404);
  },
};