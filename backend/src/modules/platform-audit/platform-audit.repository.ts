import { prisma } from "../../lib/prisma.js";

export interface AuditListQuery {
  page: number;
  limit: number;
  action?: string;
  entity?: string;
  performedById?: string;
  from?: string;
  to?: string;
}

export const platformAuditRepository = {
  async findMany(query: AuditListQuery) {
    const { page, limit, action, entity, performedById, from, to } = query;
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (action) where.action = action;
    if (entity) where.entity = { contains: entity, mode: "insensitive" };
    if (performedById) where.performedById = performedById;
    if (from || to) {
      where.createdAt = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const platformAuditLog = (prisma as any).platformAuditLog;

    const [items, total] = await Promise.all([
      platformAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          performedBy: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      platformAuditLog.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },
};
