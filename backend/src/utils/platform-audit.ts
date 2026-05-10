import { prisma } from "../lib/prisma.js";

type PlatformAuditAction =
  | "LOGIN"
  | "BUSINESS_SUSPEND"
  | "BUSINESS_REACTIVATE"
  | "BUSINESS_CANCEL"
  | "BUSINESS_UPDATE"
  | "PLAN_CHANGE"
  | "PLAN_CREATE"
  | "PLAN_UPDATE"
  | "PLAN_TOGGLE"
  | "SUBSCRIPTION_RENEW"
  | "SUBSCRIPTION_CANCEL"
  | "SUBSCRIPTION_STATUS_CHANGE"
  | "PLATFORM_USER_CREATE"
  | "PLATFORM_USER_UPDATE"
  | "PLATFORM_USER_STATUS_CHANGE";

interface PlatformAuditParams {
  performedById: string;
  action: PlatformAuditAction;
  entity: string;
  entityId: string;
  before?: object;
  after?: object;
  metadata?: object;
  ipAddress?: string;
  userAgent?: string;
}

export async function createPlatformAuditLog(params: PlatformAuditParams): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).platformAuditLog.create({ data: params });
  } catch (error) {
    console.error("[PlatformAudit] Failed to create log:", error);
  }
}
