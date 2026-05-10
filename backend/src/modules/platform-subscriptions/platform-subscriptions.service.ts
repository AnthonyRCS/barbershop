import { AppError } from "../../lib/errors.js";
import { createPlatformAuditLog } from "../../utils/platform-audit.js";
import {
  SubscriptionListQuery,
  SubscriptionStatusInput,
  SubscriptionUpdateInput,
} from "./platform-subscriptions.schema.js";
import { platformSubscriptionsRepository } from "./platform-subscriptions.repository.js";

export const platformSubscriptionsService = {
  async list(query: SubscriptionListQuery) {
    return platformSubscriptionsRepository.findMany(query);
  },

  async getById(id: string) {
    const sub = await platformSubscriptionsRepository.findById(id);
    if (!sub) throw new AppError("NOT_FOUND", 404, "Subscription not found");
    return sub;
  },

  async update(id: string, data: SubscriptionUpdateInput, actorId: string) {
    const existing = await platformSubscriptionsRepository.findById(id);
    if (!existing) throw new AppError("NOT_FOUND", 404, "Subscription not found");

    const updated = await platformSubscriptionsRepository.update(id, {
      ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
      ...(data.externalRef !== undefined && { externalRef: data.externalRef }),
    });

    await createPlatformAuditLog({
      performedById: actorId,
      action: "SUBSCRIPTION_STATUS_CHANGE",
      entity: "Subscription",
      entityId: id,
      before: existing,
      after: updated,
    });

    return updated;
  },

  async changeStatus(id: string, input: SubscriptionStatusInput, actorId: string) {
    const existing = await platformSubscriptionsRepository.findById(id);
    if (!existing) throw new AppError("NOT_FOUND", 404, "Subscription not found");

    const updated = await platformSubscriptionsRepository.update(id, { status: input.status });

    const actionMap = {
      ACTIVE: "SUBSCRIPTION_RENEW",
      CANCELLED: "SUBSCRIPTION_CANCEL",
      PAST_DUE: "SUBSCRIPTION_STATUS_CHANGE",
    } as const;

    await createPlatformAuditLog({
      performedById: actorId,
      action: actionMap[input.status],
      entity: "Subscription",
      entityId: id,
      before: { status: existing.status },
      after: { status: input.status },
      metadata: input.reason ? { reason: input.reason } : undefined,
    });

    return updated;
  },
};
