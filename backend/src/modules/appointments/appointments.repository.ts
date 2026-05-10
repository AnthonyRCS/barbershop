import { AppointmentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { toUtcRange } from "../../utils/time.js";

interface AppointmentFilters {
  date?: string;
  barberId?: string;
  status?: AppointmentStatus;
  page?: number;
  limit?: number;
}

function getUtcDayRange(dateIso: string): { start: Date; end: Date } {
  const [year, month, day] = dateIso.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));
  return { start, end };
}

export const appointmentsRepository = {
  findByBarberId(barberId: string, date: Date) {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
    const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 0, 0, 0));

    return prisma.appointment.findMany({
      where: {
        barberId,
        deletedAt: null,
        appointmentDate: { gte: start, lt: end },
      },
      orderBy: { startTime: "asc" },
    });
  },

  async checkConflict(barberId: string, startTime: Date, endTime: Date, excludeId?: string): Promise<boolean> {
    const conflict = await prisma.appointment.findFirst({
      where: {
        barberId,
        deletedAt: null,
        status: { in: ["PENDING", "CONFIRMED", "COMPLETED", "NO_SHOW"] },
        id: excludeId ? { not: excludeId } : undefined,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true },
    });

    return Boolean(conflict);
  },

  async findByBusinessId(businessId: string, filters: AppointmentFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;
    const dayRange = filters.date ? getUtcDayRange(filters.date) : undefined;

    const where = {
      businessId,
      deletedAt: null,
      appointmentDate: dayRange ? { gte: dayRange.start, lt: dayRange.end } : undefined,
      barberId: filters.barberId,
      status: filters.status,
    };

    const [data, total] = await prisma.$transaction([
      prisma.appointment.findMany({
        where,
        include: {
          customer: true,
          barber: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
          service: true,
        },
        orderBy: { startTime: "asc" },
        skip,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  findByIdempotencyKey(businessId: string, idempotencyKey: string) {
    return prisma.appointment.findUnique({
      where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
      include: {
        customer: true,
        barber: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
        service: true,
      },
    });
  },

  findById(id: string, businessId: string) {
    return prisma.appointment.findFirst({
      where: { id, businessId, deletedAt: null },
      include: {
        customer: true,
        barber: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
        service: true,
      },
    });
  },

  create(data: Prisma.AppointmentUncheckedCreateInput) {
    return prisma.appointment.create({ data });
  },

  update(id: string, businessId: string, data: Prisma.AppointmentUpdateInput) {
    return prisma.appointment.updateMany({
      where: { id, businessId, deletedAt: null },
      data,
    });
  },

  softDelete(id: string, businessId: string) {
    return prisma.appointment.updateMany({
      where: { id, businessId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  },

  countMonthly(businessId: string, year: number, month: number) {
    const range = toUtcRange(year, month);
    return prisma.appointment.count({
      where: {
        businessId,
        deletedAt: null,
        appointmentDate: { gte: range.start, lt: range.end },
      },
    });
  },

  findBusinessWithActiveSubscriptionPlan(businessId: string) {
    return prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
      include: {
        subscriptions: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          include: { plan: true },
          take: 1,
        },
      },
    });
  },

  findServiceById(serviceId: string, businessId: string) {
    return prisma.service.findFirst({
      where: { id: serviceId, businessId, deletedAt: null, active: true },
    });
  },

  findBarberById(barberId: string, businessId: string) {
    return prisma.barber.findFirst({
      where: { id: barberId, businessId, deletedAt: null, active: true },
    });
  },

  findCustomerById(customerId: string, businessId: string) {
    return prisma.customer.findFirst({
      where: { id: customerId, businessId, deletedAt: null, isActive: true },
      select: { id: true },
    });
  },

  async findCustomerAccountIdByCustomerId(customerId: string, businessId: string) {
    const link = await prisma.customerAccountLink.findFirst({
      where: { customerId, businessId },
      select: { accountId: true },
    });

    return link?.accountId ?? null;
  },
};
