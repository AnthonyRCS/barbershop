import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { createPlatformAuditLog } from "../../utils/platform-audit.js";
import {
  BusinessListQuery,
  BusinessPlanInput,
  BusinessStatusInput,
  BusinessUpdateInput,
} from "./platform-businesses.schema.js";
import { platformBusinessesRepository } from "./platform-businesses.repository.js";

export const platformBusinessesService = {
  async list(query: BusinessListQuery) {
    return platformBusinessesRepository.findMany(query);
  },

  async getById(id: string) {
    const business = await platformBusinessesRepository.findById(id);
    if (!business) throw new AppError("NOT_FOUND", 404, "Business not found");

    const stats = await platformBusinessesRepository.getBusinessStats(id);
    return { ...business, stats };
  },

  async update(id: string, data: BusinessUpdateInput, actorId: string) {
    const existing = await platformBusinessesRepository.findById(id);
    if (!existing) throw new AppError("NOT_FOUND", 404, "Business not found");

    const updated = await platformBusinessesRepository.update(id, data);

    await createPlatformAuditLog({
      performedById: actorId,
      action: "BUSINESS_UPDATE",
      entity: "Business",
      entityId: id,
      before: existing,
      after: updated,
    });

    return updated;
  },

  async changeStatus(id: string, input: BusinessStatusInput, actorId: string) {
    const existing = await platformBusinessesRepository.findById(id);
    if (!existing) throw new AppError("NOT_FOUND", 404, "Business not found");

    const updated = await platformBusinessesRepository.update(id, { status: input.status });

    const actionMap = {
      SUSPENDED: "BUSINESS_SUSPEND",
      ACTIVE: "BUSINESS_REACTIVATE",
      CANCELLED: "BUSINESS_CANCEL",
      TRIAL: "BUSINESS_UPDATE",
    } as const;

    await createPlatformAuditLog({
      performedById: actorId,
      action: actionMap[input.status],
      entity: "Business",
      entityId: id,
      before: { status: existing.status },
      after: { status: input.status },
      metadata: input.reason ? { reason: input.reason } : undefined,
    });

    return updated;
  },

  async changePlan(id: string, input: BusinessPlanInput, actorId: string) {
    const existing = await platformBusinessesRepository.findById(id);
    if (!existing) throw new AppError("NOT_FOUND", 404, "Business not found");

    const plan = await prisma.plan.findFirst({ where: { id: input.planId, active: true } });
    if (!plan) throw new AppError("NOT_FOUND", 404, "Plan not found or inactive");

    const updated = await platformBusinessesRepository.changePlan(id, input.planId);

    await createPlatformAuditLog({
      performedById: actorId,
      action: "PLAN_CHANGE",
      entity: "Business",
      entityId: id,
      before: { planId: existing.planId },
      after: { planId: input.planId },
    });

    return updated;
  },
};
