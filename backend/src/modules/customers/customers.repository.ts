import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { CustomerListQuery } from "./customers.schema.js";

// ─── Shared include / select helpers ─────────────────────────────────────────

const customerListSelect = {
  id: true,
  businessId: true,
  name: true,
  photoUrl: true,
  phone: true,
  email: true,
  notes: true,
  birthDate: true,
  preferredBarberId: true,
  totalVisits: true,
  totalSpent: true,
  lastVisitAt: true,
  isActive: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
  preferredBarber: {
    select: {
      id: true,
      user: { select: { name: true } },
    },
  },
  accountLink: {
    select: { id: true, linkedAt: true },
  },
} satisfies Prisma.CustomerSelect;

const historyInclude = {
  service: {
    select: { id: true, name: true, price: true, durationMinutes: true },
  },
  barber: {
    include: {
      user: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.AppointmentInclude;

// ─── Repository ───────────────────────────────────────────────────────────────

export const customersRepository = {
  /** Paginated list with optional search and filters */
  async list(businessId: string, filters: CustomerListQuery) {
    const { search, isActive, page, limit, sortBy, sortDir } = filters;

    const searchWhere: Prisma.CustomerWhereInput | undefined = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined;

    const where: Prisma.CustomerWhereInput = {
      businessId,
      deletedAt: null,
      isActive: isActive !== undefined ? isActive : undefined,
      ...searchWhere,
    };

    const orderBy: Prisma.CustomerOrderByWithRelationInput =
      sortBy === "name"
        ? { name: sortDir }
        : sortBy === "lastVisitAt"
          ? { lastVisitAt: { sort: sortDir, nulls: "last" } }
          : sortBy === "totalVisits"
            ? { totalVisits: sortDir }
            : sortBy === "totalSpent"
              ? { totalSpent: sortDir }
              : { createdAt: sortDir };

    const [data, total] = await prisma.$transaction([
      prisma.customer.findMany({
        where,
        select: customerListSelect,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  /** Single customer with full detail */
  getById(id: string, businessId: string) {
    return prisma.customer.findFirst({
      where: { id, businessId, deletedAt: null },
      select: {
        ...customerListSelect,
        createdBy: { select: { id: true, name: true } },
      },
    });
  },

  /** Appointment history for a customer */
  async getHistory(
    customerId: string,
    businessId: string,
    page: number,
    limit: number,
  ) {
    const where: Prisma.AppointmentWhereInput = {
      customerId,
      businessId,
      deletedAt: null,
    };

    const [data, total] = await prisma.$transaction([
      prisma.appointment.findMany({
        where,
        include: historyInclude,
        orderBy: { startTime: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  /** Exact-match lookup by phone or email within a business (for dedup) */
  lookup(
    businessId: string,
    opts: { phone?: string; email?: string; excludeId?: string },
  ) {
    const orConditions: Prisma.CustomerWhereInput[] = [];
    if (opts.phone) orConditions.push({ phone: opts.phone });
    if (opts.email) orConditions.push({ email: opts.email });

    if (orConditions.length === 0) return Promise.resolve([]);

    return prisma.customer.findMany({
      where: {
        businessId,
        deletedAt: null,
        OR: orConditions,
        id: opts.excludeId ? { not: opts.excludeId } : undefined,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        totalVisits: true,
        lastVisitAt: true,
        isActive: true,
      },
    });
  },

  create(data: Prisma.CustomerUncheckedCreateInput) {
    return prisma.customer.create({ data, include: { preferredBarber: { include: { user: { select: { name: true } } } } } });
  },

  createInvitation(data: {
    businessId: string;
    customerId: string;
    email: string;
    tokenHash: string;
    expiresAt: Date;
    createdById: string;
  }) {
    return prisma.customerInvitation.create({
      data: {
        businessId: data.businessId,
        customerId: data.customerId,
        email: data.email,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        createdById: data.createdById,
      },
    });
  },

  update(id: string, businessId: string, data: Prisma.CustomerUncheckedUpdateInput) {
    return prisma.customer.updateMany({
      where: { id, businessId, deletedAt: null },
      data,
    });
  },

  softDelete(id: string, businessId: string) {
    return prisma.customer.updateMany({
      where: { id, businessId, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
  },

  /** Recalculate and persist totalVisits + totalSpent + lastVisitAt from appointment history */
  async recalculateStats(customerId: string, businessId: string) {
    const agg = await prisma.appointment.aggregate({
      where: {
        customerId,
        businessId,
        status: "COMPLETED",
        deletedAt: null,
      },
      _count: true,
      _sum: { finalPrice: true },
      _max: { startTime: true },
    });

    return prisma.customer.updateMany({
      where: { id: customerId, businessId, deletedAt: null },
      data: {
        totalVisits: agg._count,
        totalSpent: agg._sum.finalPrice ?? 0,
        lastVisitAt: agg._max.startTime ?? undefined,
      },
    });
  },
};
