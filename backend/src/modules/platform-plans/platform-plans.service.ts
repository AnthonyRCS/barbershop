import { AppError } from "../../lib/errors.js";
import { createPlatformAuditLog } from "../../utils/platform-audit.js";
import { PlanCreateInput, PlanUpdateInput } from "./platform-plans.schema.js";
import { platformPlansRepository } from "./platform-plans.repository.js";

export const platformPlansService = {
  async list() {
    return platformPlansRepository.findAll();
  },

  async create(data: PlanCreateInput, actorId: string) {
    const plan = await platformPlansRepository.create({
      name: data.name,
      price: data.price,
      maxBarbers: data.maxBarbers,
      maxAppointmentsPerMonth: data.maxAppointmentsPerMonth,
      features: data.features as object,
      active: data.active,
    });

    await createPlatformAuditLog({
      performedById: actorId,
      action: "PLAN_CREATE",
      entity: "Plan",
      entityId: plan.id,
      after: plan,
    });

    return plan;
  },

  async update(id: string, data: PlanUpdateInput, actorId: string) {
    const existing = await platformPlansRepository.findById(id);
    if (!existing) throw new AppError("NOT_FOUND", 404, "Plan not found");

    const updated = await platformPlansRepository.update(id, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.maxBarbers !== undefined && { maxBarbers: data.maxBarbers }),
      ...(data.maxAppointmentsPerMonth !== undefined && { maxAppointmentsPerMonth: data.maxAppointmentsPerMonth }),
      ...(data.features !== undefined && { features: data.features as object }),
      ...(data.active !== undefined && { active: data.active }),
    });

    await createPlatformAuditLog({
      performedById: actorId,
      action: "PLAN_UPDATE",
      entity: "Plan",
      entityId: id,
      before: existing,
      after: updated,
    });

    return updated;
  },

  async toggle(id: string, actorId: string) {
    const existing = await platformPlansRepository.findById(id);
    if (!existing) throw new AppError("NOT_FOUND", 404, "Plan not found");

    const updated = await platformPlansRepository.toggle(id, !existing.active);

    await createPlatformAuditLog({
      performedById: actorId,
      action: "PLAN_TOGGLE",
      entity: "Plan",
      entityId: id,
      before: { active: existing.active },
      after: { active: updated.active },
    });

    return updated;
  },
};
