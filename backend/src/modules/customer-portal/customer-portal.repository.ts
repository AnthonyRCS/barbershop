import { AppointmentStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export const customerPortalRepository = {
  // ── CustomerAccount ───────────────────────────────────────────────────────────

  findAccountByEmail(email: string) {
    return prisma.customerAccount.findUnique({
      where: { email },
      include: {
        links: {
          include: {
            customer: { select: { id: true, name: true, phone: true, email: true, businessId: true } },
            business: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
  },

  findAccountById(id: string) {
    return prisma.customerAccount.findUnique({
      where: { id },
      include: {
        links: {
          include: {
            customer: { select: { id: true, name: true, phone: true, email: true, businessId: true } },
            business: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
  },

  createAccount(data: { email: string; passwordHash: string }) {
    return prisma.customerAccount.create({
      data,
      include: {
        links: {
          include: {
            customer: { select: { id: true, name: true, phone: true, email: true, businessId: true } },
            business: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
  },

  updateAccount(id: string, data: { emailVerifiedAt?: Date; status?: "ACTIVE" | "PENDING_VERIFICATION" | "SUSPENDED" }) {
    return prisma.customerAccount.update({ where: { id }, data });
  },

  updateAccountPassword(id: string, passwordHash: string) {
    return prisma.customerAccount.update({ where: { id }, data: { passwordHash } });
  },

  // ── CustomerAccountLink ───────────────────────────────────────────────────────

  linkAccountToCustomer(data: { accountId: string; customerId: string; businessId: string }) {
    return prisma.customerAccountLink.create({ data });
  },

  // ── CustomerInvitation ────────────────────────────────────────────────────────

  findInvitationByTokenHash(tokenHash: string) {
    return prisma.customerInvitation.findUnique({
      where: { tokenHash },
      include: {
        customer: { select: { id: true, name: true, email: true, businessId: true } },
        business: { select: { id: true, name: true, slug: true } },
      },
    });
  },

  acceptInvitation(id: string) {
    return prisma.customerInvitation.update({
      where: { id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
  },

  // ── Auto-link by email ────────────────────────────────────────────────────────

  findBusinessBySlug(slug: string) {
    return prisma.business.findFirst({
      where: {
        slug,
        deletedAt: null,
        status: { in: ["TRIAL", "ACTIVE"] },
      },
      select: { id: true, name: true, slug: true, appointmentIntervalMinutes: true },
    });
  },

  findLinkedBusiness(accountId: string, businessId: string) {
    return prisma.customerAccountLink.findFirst({
      where: { accountId, businessId },
      select: { id: true, customerId: true, businessId: true },
    });
  },

  findAnyLinkedBusiness(accountId: string) {
    return prisma.customerAccountLink.findFirst({
      where: { accountId },
      select: { id: true, customerId: true, businessId: true },
      orderBy: { linkedAt: "asc" },
    });
  },

  findAppointmentCreatorUser(businessId: string) {
    return prisma.user.findFirst({
      where: {
        businessId,
        active: true,
        deletedAt: null,
        role: { in: ["OWNER", "ADMIN", "RECEPTIONIST", "BARBER"] },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: { id: true, role: true, name: true },
    });
  },

  getBusinessCatalog(businessId: string) {
    return prisma.business.findFirst({
      where: { id: businessId, deletedAt: null, status: { in: ["TRIAL", "ACTIVE"] } },
      select: {
        id: true,
        name: true,
        slug: true,
        services: {
          where: { deletedAt: null, active: true },
          select: { id: true, name: true, durationMinutes: true, price: true },
          orderBy: { name: "asc" },
        },
        barbers: {
          where: { deletedAt: null, active: true, user: { active: true, deletedAt: null } },
          select: {
            id: true,
            specialty: true,
            user: { select: { id: true, name: true, photoUrl: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  },

  getBusinessHoursByDay(businessId: string, dayOfWeek: number) {
    return prisma.businessHours.findFirst({
      where: { businessId, dayOfWeek },
      select: {
        dayOfWeek: true,
        openTime: true,
        closeTime: true,
        isOpen: true,
      },
    });
  },

  findBarberAppointmentsForDate(businessId: string, barberId: string, dayStart: Date, dayEnd: Date) {
    return prisma.appointment.findMany({
      where: {
        businessId,
        barberId,
        deletedAt: null,
        status: { in: ["PENDING", "CONFIRMED", "COMPLETED", "NO_SHOW"] },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
      },
      orderBy: { startTime: "asc" },
    });
  },

  // ── Appointments ──────────────────────────────────────────────────────────────

  async getAppointments(
    customerIds: string[],
    opts: { upcoming?: boolean; businessId?: string; page: number; limit: number }
  ) {
    const now = new Date();
    const where = {
      customerId: { in: customerIds },
      deletedAt: null,
      businessId: opts.businessId,
      ...(opts.upcoming !== undefined
        ? opts.upcoming
          ? { startTime: { gte: now }, status: { in: ["PENDING", "CONFIRMED"] as AppointmentStatus[] } }
          : { startTime: { lt: now } }
        : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.appointment.findMany({
        where,
        include: {
          service: { select: { id: true, name: true, durationMinutes: true, price: true } },
          barber: { include: { user: { select: { id: true, name: true } } } },
          business: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { startTime: opts.upcoming ? "asc" : "desc" },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      prisma.appointment.count({ where }),
    ]);

    return { data, total, page: opts.page, limit: opts.limit, pages: Math.ceil(total / opts.limit) };
  },

  findAppointmentByIdForAccount(accountId: string, appointmentId: string) {
    return prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        deletedAt: null,
        customer: {
          accountLink: {
            accountId,
          },
        },
      },
      include: {
        customer: true,
        barber: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
        service: true,
      },
    });
  },
};
