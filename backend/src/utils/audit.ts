import { AuditAction } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

interface AuditParams {
  businessId: string;
  userId: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  before?: object;
  after?: object;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({ data: params });
  } catch (error) {
    console.error("[Audit] Failed to create log:", error);
  }
}
