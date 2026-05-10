import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

/**
 * Marks expired subscriptions as PAST_DUE and, when still PAST_DUE after the
 * grace period, suspends the associated business.
 *
 * Run this on startup and then every hour.
 */
export async function processExpiredSubscriptions(): Promise<void> {
  try {
    const now = new Date();

    // 1. Active subscriptions whose end date has passed → PAST_DUE
    const expiredResult = await prisma.subscription.updateMany({
      where: {
        status: "ACTIVE",
        endDate: { lt: now },
      },
      data: { status: "PAST_DUE" },
    });

    if (expiredResult.count > 0) {
      logger.info({ count: expiredResult.count }, "[subscriptionExpiry] Subscriptions marked PAST_DUE");
    }

    // 2. Businesses with no ACTIVE subscription and TRIAL/ACTIVE status → SUSPENDED
    const businessesWithNoActive = await prisma.business.findMany({
      where: {
        deletedAt: null,
        status: { in: ["TRIAL", "ACTIVE"] },
        subscriptions: {
          none: { status: "ACTIVE" },
        },
      },
      select: { id: true },
    });

    if (businessesWithNoActive.length > 0) {
      const ids = businessesWithNoActive.map((b) => b.id);
      const suspendResult = await prisma.business.updateMany({
        where: { id: { in: ids } },
        data: { status: "SUSPENDED" },
      });
      logger.warn({ count: suspendResult.count, businessIds: ids }, "[subscriptionExpiry] Businesses suspended");
    }
  } catch (error) {
    logger.error({ error }, "[subscriptionExpiry] Failed to process expired subscriptions");
  }
}

/** Schedule the job to run every hour */
export function startSubscriptionExpiryJob(): void {
  // Run immediately on startup
  void processExpiredSubscriptions();
  // Then every hour
  setInterval(() => void processExpiredSubscriptions(), 60 * 60 * 1000).unref();
  logger.info("[subscriptionExpiry] Job scheduled (every 1h)");
}
