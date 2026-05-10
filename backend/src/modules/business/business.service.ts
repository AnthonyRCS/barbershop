import { AppError } from "../../lib/errors.js";
import { businessRepository } from "./business.repository.js";
import { UpdateBusinessSchema, UpdateBusinessHoursSchema } from "./business.schema.js";

const DEFAULT_HOURS = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  dayOfWeek: day,
  openTime: "09:00",
  closeTime: "18:00",
  isOpen: day !== 0, // Sunday closed by default
}));

export const businessService = {
  async getCurrent(businessId: string) {
    const business = await businessRepository.getById(businessId);
    if (!business) {
      throw new AppError("BUSINESS_NOT_FOUND", 404);
    }
    return business;
  },
  async updateCurrent(businessId: string, data: unknown) {
    const payload = UpdateBusinessSchema.parse(data);
    const result = await businessRepository.update(businessId, payload);
    if (result.count === 0) {
      throw new AppError("BUSINESS_NOT_FOUND", 404);
    }
    return businessRepository.getById(businessId);
  },
  async getHours(businessId: string) {
    const hours = await businessRepository.getHours(businessId);
    // If not configured yet, return defaults
    if (hours.length < 7) {
      return DEFAULT_HOURS;
    }
    return hours;
  },
  async updateHours(businessId: string, data: unknown) {
    const payload = UpdateBusinessHoursSchema.parse(data);
    return businessRepository.upsertHours(businessId, payload);
  },
};