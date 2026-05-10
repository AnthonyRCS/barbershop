import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import { sendMail } from "../../lib/mailer.js";
import { getPublicFrontendUrl } from "../../utils/origins.js";
import { hashPassword, comparePassword } from "../../utils/password.js";
import { hashToken, isTokenExpired } from "../../utils/token.js";
import { appointmentsService } from "../appointments/appointments.service.js";
import { customerPortalRepository } from "./customer-portal.repository.js";
import {
  PortalRegisterInput,
  PortalLoginInput,
  PortalClaimAccountInput,
  PortalVerifyEmailInput,
  PortalAppointmentsQuery,
  PortalRequestAppointmentInput,
  PortalAvailabilityQuery,
} from "./customer-portal.schema.js";

// ── JWT ───────────────────────────────────────────────────────────────────────

function getCustomerSecret(): string {
  if (!env.CUSTOMER_JWT_SECRET) {
    throw new AppError("PORTAL_NOT_CONFIGURED", 503, "Customer portal is not enabled");
  }
  return env.CUSTOMER_JWT_SECRET;
}

function signCustomerToken(accountId: string): string {
  return jwt.sign({ sub: accountId, type: "customer" }, getCustomerSecret(), {
    expiresIn: env.CUSTOMER_JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyCustomerToken(token: string): { sub: string } {
  try {
    return jwt.verify(token, getCustomerSecret()) as { sub: string };
  } catch {
    throw new AppError("UNAUTHORIZED", 401, "Token de cliente inválido o expirado");
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

function toDateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) {
    throw new AppError("INVALID_DATE", 400, "Fecha invalida");
  }
  return { year, month, day };
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new AppError("INVALID_TIME", 400, "Formato de hora invalido");
  }
  return hours * 60 + minutes;
}

function combineLocalDateAndMinutes(date: string, minutes: number): Date {
  const { year, month, day } = toDateParts(date);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return new Date(year, month - 1, day, hours, mins, 0, 0);
}

function formatHourMinute(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}
export const customerPortalService = {
  async register(input: PortalRegisterInput) {
    getCustomerSecret(); // Ensure portal is configured

    const existing = await customerPortalRepository.findAccountByEmail(input.email.toLowerCase());
    if (existing) {
      throw new AppError("EMAIL_ALREADY_REGISTERED", 409, "Este email ya tiene una cuenta");
    }

    const passwordHash = await hashPassword(input.password);
    const account = await customerPortalRepository.createAccount({
      email: input.email.toLowerCase(),
      passwordHash,
    });

    const token = signCustomerToken(account.id);

    // Send verification email (best-effort)
    const verifyToken = Buffer.from(`${account.id}:${Date.now()}`).toString("base64url");
    sendMail({
      to: account.email,
      subject: "Verifica tu cuenta — Barbershop Pro",
      html: buildVerificationEmail(input.name, `${getPublicFrontendUrl()}/customer/verify-email?token=${verifyToken}`),
    }).catch(() => {/* non-blocking */});

    return { token, account: { id: account.id, email: account.email, status: account.status } };
  },

  async login(input: PortalLoginInput) {
    getCustomerSecret();

    const account = await customerPortalRepository.findAccountByEmail(input.email.toLowerCase());
    if (!account) {
      throw new AppError("INVALID_CREDENTIALS", 401, "Credenciales inválidas");
    }
    if (account.status === "SUSPENDED") {
      throw new AppError("ACCOUNT_SUSPENDED", 403, "Tu cuenta ha sido suspendida");
    }

    const matches = await bcrypt.compare(input.password, account.passwordHash);
    if (!matches) {
      throw new AppError("INVALID_CREDENTIALS", 401, "Credenciales inválidas");
    }

    await customerPortalRepository.updateAccount(account.id, {});

    const token = signCustomerToken(account.id);

    return {
      token,
      account: {
        id: account.id,
        email: account.email,
        status: account.status,
        linkedBusinesses: account.links.map((l) => ({
          businessId: l.businessId,
          businessName: l.business.name,
          customerId: l.customerId,
          customerName: l.customer.name,
        })),
      },
    };
  },

  async claimAccount(input: PortalClaimAccountInput) {
    getCustomerSecret();

    const tokenHash = hashToken(input.token);
    const invitation = await customerPortalRepository.findInvitationByTokenHash(tokenHash);

    if (!invitation) {
      throw new AppError("INVALID_INVITATION_TOKEN", 400, "Token de invitación inválido");
    }
    if (invitation.status !== "PENDING") {
      throw new AppError("INVITATION_ALREADY_USED", 400, "Esta invitación ya fue utilizada");
    }
    if (isTokenExpired(invitation.expiresAt)) {
      throw new AppError("INVITATION_EXPIRED", 400, "La invitación ha expirado");
    }

    // Validate email matches invitation
    if (invitation.email.toLowerCase() !== input.email.toLowerCase()) {
      throw new AppError("INVITATION_EMAIL_MISMATCH", 400, "El email no coincide con la invitación");
    }

    // Find or create CustomerAccount
    let accountId: string;
    let accountEmail: string;
    let accountStatus: string;

    const existing = await customerPortalRepository.findAccountByEmail(input.email.toLowerCase());
    if (existing) {
      const alreadyLinkedBusinessId = existing.links[0]?.businessId;
      if (alreadyLinkedBusinessId && alreadyLinkedBusinessId !== invitation.businessId) {
        throw new AppError(
          "ACCOUNT_ALREADY_LINKED_TO_OTHER_BUSINESS",
          409,
          "Esta cuenta ya pertenece a otra barberia y no puede vincularse a multiples negocios",
        );
      }

      accountId = existing.id;
      accountEmail = existing.email;
      accountStatus = existing.status;
      // Link if not already linked
      const alreadyLinked = existing.links.some((l) => l.customerId === invitation.customerId);
      if (!alreadyLinked) {
        await customerPortalRepository.linkAccountToCustomer({
          accountId: existing.id,
          customerId: invitation.customerId,
          businessId: invitation.businessId,
        });
      }
    } else {
      const passwordHash = await hashPassword(input.password);
      const created = await customerPortalRepository.createAccount({
        email: input.email.toLowerCase(),
        passwordHash,
      });
      accountId = created.id;
      accountEmail = created.email;
      accountStatus = created.status;
      await customerPortalRepository.linkAccountToCustomer({
        accountId: created.id,
        customerId: invitation.customerId,
        businessId: invitation.businessId,
      });
    }

    await customerPortalRepository.acceptInvitation(invitation.id);

    const token = signCustomerToken(accountId);
    return { token, account: { id: accountId, email: accountEmail, status: accountStatus } };
  },

  async verifyEmail(input: PortalVerifyEmailInput) {
    // Decode simple base64 token: accountId:timestamp
    let accountId: string;
    try {
      const decoded = Buffer.from(input.token, "base64url").toString("utf8");
      const [id] = decoded.split(":");
      accountId = id;
    } catch {
      throw new AppError("INVALID_VERIFICATION_TOKEN", 400, "Token de verificación inválido");
    }

    const account = await customerPortalRepository.findAccountById(accountId);
    if (!account) {
      throw new AppError("ACCOUNT_NOT_FOUND", 404, "Cuenta no encontrada");
    }
    if (account.emailVerifiedAt) {
      return { message: "El email ya fue verificado" };
    }

    await customerPortalRepository.updateAccount(accountId, {
      emailVerifiedAt: new Date(),
      status: "ACTIVE",
    });

    return { message: "Email verificado exitosamente" };
  },

  async getMe(accountId: string) {
    const account = await customerPortalRepository.findAccountById(accountId);
    if (!account) throw new AppError("ACCOUNT_NOT_FOUND", 404);

    return {
      id: account.id,
      email: account.email,
      status: account.status,
      emailVerifiedAt: account.emailVerifiedAt,
      linkedBusinesses: account.links.map((l) => ({
        businessId: l.businessId,
        businessName: l.business.name,
        businessSlug: l.business.slug,
        customerId: l.customerId,
        customerName: l.customer.name,
        customerPhone: l.customer.phone,
      })),
    };
  },

  async getAppointments(accountId: string, query: PortalAppointmentsQuery) {
    const primaryLink = await customerPortalRepository.findAnyLinkedBusiness(accountId);
    if (!primaryLink) {
      return { data: [], total: 0, page: query.page, limit: query.limit, pages: 0 };
    }

    return customerPortalRepository.getAppointments([primaryLink.customerId], {
      upcoming: query.upcoming,
      businessId: primaryLink.businessId,
      page: query.page,
      limit: query.limit,
    });
  },

  async getBusinessCatalog(accountId: string, businessSlug: string) {
    const business = await customerPortalRepository.findBusinessBySlug(businessSlug.toLowerCase());
    if (!business) {
      throw new AppError("BUSINESS_NOT_FOUND", 404, "Barberia no encontrada");
    }

    const catalog = await customerPortalRepository.getBusinessCatalog(business.id);
    if (!catalog) {
      throw new AppError("BUSINESS_NOT_FOUND", 404, "Barberia no disponible");
    }

    const existingLink = await customerPortalRepository.findLinkedBusiness(accountId, business.id);
    if (!existingLink) {
      throw new AppError("BUSINESS_ACCESS_DENIED", 403, "No tienes acceso a esta barberia");
    }
    return { ...catalog, selected: true };
  },

  async getAvailability(accountId: string, businessSlug: string, input: PortalAvailabilityQuery) {
    const business = await customerPortalRepository.findBusinessBySlug(businessSlug.toLowerCase());
    if (!business) {
      throw new AppError("BUSINESS_NOT_FOUND", 404, "Barberia no encontrada");
    }

    const existingLink = await customerPortalRepository.findLinkedBusiness(accountId, business.id);
    if (!existingLink) {
      throw new AppError("BUSINESS_ACCESS_DENIED", 403, "No tienes acceso a esta barberia");
    }

    const catalog = await customerPortalRepository.getBusinessCatalog(business.id);
    if (!catalog) {
      throw new AppError("BUSINESS_NOT_FOUND", 404, "Barberia no disponible");
    }

    const barber = catalog.barbers.find((item) => item.id === input.barberId);
    if (!barber) {
      throw new AppError("BARBER_NOT_FOUND", 404, "Barbero no encontrado");
    }

    const service = catalog.services.find((item) => item.id === input.serviceId);
    if (!service) {
      throw new AppError("SERVICE_NOT_FOUND", 404, "Servicio no encontrado");
    }

    const { year, month, day } = toDateParts(input.date);
    const dayDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dayOfWeek = dayDate.getDay();

    const dayHours = await customerPortalRepository.getBusinessHoursByDay(business.id, dayOfWeek);
    if (!dayHours || !dayHours.isOpen) {
      return {
        date: input.date,
        dayOfWeek,
        isOpen: false,
        openTime: dayHours?.openTime ?? null,
        closeTime: dayHours?.closeTime ?? null,
        serviceDurationMinutes: service.durationMinutes,
        slotIntervalMinutes: business.appointmentIntervalMinutes,
        slots: [],
      };
    }

    const openMinutes = parseTimeToMinutes(dayHours.openTime);
    const closeMinutes = parseTimeToMinutes(dayHours.closeTime);
    if (closeMinutes <= openMinutes) {
      throw new AppError("INVALID_BUSINESS_HOURS", 409, "La barberia tiene un horario invalido en ajustes");
    }

    const dayStart = combineLocalDateAndMinutes(input.date, 0);
    const dayEnd = combineLocalDateAndMinutes(input.date, 24 * 60);
    const appointments = await customerPortalRepository.findBarberAppointmentsForDate(
      business.id,
      input.barberId,
      dayStart,
      dayEnd
    );

    const nowMs = Date.now();
    const stepMinutes = Math.max(5, business.appointmentIntervalMinutes);
    const slots: Array<{
      startTime: string;
      endTime: string;
      startLabel: string;
      endLabel: string;
      available: boolean;
      reason?: "PAST" | "OCCUPIED";
    }> = [];

    for (
      let startMinutes = openMinutes;
      startMinutes + service.durationMinutes <= closeMinutes;
      startMinutes += stepMinutes
    ) {
      const endMinutes = startMinutes + service.durationMinutes;
      const startDate = combineLocalDateAndMinutes(input.date, startMinutes);
      const endDate = combineLocalDateAndMinutes(input.date, endMinutes);

      if (startDate.getTime() <= nowMs) {
        slots.push({
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          startLabel: formatHourMinute(startMinutes),
          endLabel: formatHourMinute(endMinutes),
          available: false,
          reason: "PAST",
        });
        continue;
      }

      const overlaps = appointments.some(
        (item) => startDate.getTime() < item.endTime.getTime() && endDate.getTime() > item.startTime.getTime()
      );

      slots.push({
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        startLabel: formatHourMinute(startMinutes),
        endLabel: formatHourMinute(endMinutes),
        available: !overlaps,
        reason: overlaps ? "OCCUPIED" : undefined,
      });
    }

    return {
      date: input.date,
      dayOfWeek,
      isOpen: true,
      openTime: dayHours.openTime,
      closeTime: dayHours.closeTime,
      serviceDurationMinutes: service.durationMinutes,
      slotIntervalMinutes: stepMinutes,
      selected: true,
      slots,
    };
  },

  async requestAppointment(accountId: string, businessSlug: string, input: PortalRequestAppointmentInput) {
    const business = await customerPortalRepository.findBusinessBySlug(businessSlug.toLowerCase());
    if (!business) {
      throw new AppError("BUSINESS_NOT_FOUND", 404, "Barberia no encontrada");
    }

    const link = await customerPortalRepository.findLinkedBusiness(accountId, business.id);
    if (!link) {
      throw new AppError("BUSINESS_ACCESS_DENIED", 403, "No tienes acceso a esta barberia");
    }

    const creator = await customerPortalRepository.findAppointmentCreatorUser(business.id);
    if (!creator) {
      throw new AppError("BUSINESS_NOT_READY", 409, "La barberia aun no esta lista para recibir citas");
    }

    const start = new Date(input.startTime);
    if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
      throw new AppError("APPOINTMENT_IN_PAST", 400, "No puedes solicitar citas en fecha u hora pasada");
    }

    const dayOfWeek = start.getDay();
    const dayHours = await customerPortalRepository.getBusinessHoursByDay(business.id, dayOfWeek);
    if (!dayHours || !dayHours.isOpen) {
      throw new AppError("BUSINESS_CLOSED", 409, "La barberia esta cerrada en ese dia");
    }

    const catalog = await customerPortalRepository.getBusinessCatalog(business.id);
    const selectedService = catalog?.services.find((item) => item.id === input.serviceId);
    if (!selectedService) {
      throw new AppError("SERVICE_NOT_FOUND", 404, "Servicio no encontrado");
    }

    const openMinutes = parseTimeToMinutes(dayHours.openTime);
    const closeMinutes = parseTimeToMinutes(dayHours.closeTime);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = startMinutes + selectedService.durationMinutes;
    if (startMinutes < openMinutes || endMinutes > closeMinutes) {
      throw new AppError("OUTSIDE_BUSINESS_HOURS", 409, "La hora seleccionada esta fuera del horario de atencion");
    }

    const appointmentDate = new Date(start);
    appointmentDate.setUTCHours(0, 0, 0, 0);

    const appointment = await appointmentsService.createAppointment(
      {
        customerId: link.customerId,
        barberId: input.barberId,
        serviceId: input.serviceId,
        appointmentDate: appointmentDate.toISOString(),
        startTime: start.toISOString(),
        notes: input.notes,
        idempotencyKey: randomUUID(),
      },
      creator.id,
      business.id,
      { allowScheduleConflict: false }
    );

    return {
      message: "Cita solicitada exitosamente",
      appointment,
    };
  },

  async cancelAppointment(accountId: string, appointmentId: string) {
    const appointment = await customerPortalRepository.findAppointmentByIdForAccount(accountId, appointmentId);
    if (!appointment) {
      throw new AppError("APPOINTMENT_NOT_FOUND", 404, "Cita no encontrada");
    }

    if (!["PENDING", "CONFIRMED"].includes(appointment.status)) {
      throw new AppError("APPOINTMENT_NOT_CANCELLABLE", 409, "Esta cita ya no se puede cancelar");
    }

    const cutoffMs = env.CUSTOMER_CANCEL_MIN_HOURS * 60 * 60 * 1000;
    const msUntilAppointment = appointment.startTime.getTime() - Date.now();
    if (msUntilAppointment < cutoffMs) {
      throw new AppError(
        "CANCELLATION_WINDOW_CLOSED",
        409,
        `Solo puedes cancelar con al menos ${env.CUSTOMER_CANCEL_MIN_HOURS} horas de anticipacion`
      );
    }

    const actor = await customerPortalRepository.findAppointmentCreatorUser(appointment.businessId);
    const updated = await appointmentsService.updateAppointment(
      appointment.id,
      appointment.businessId,
      {
        status: "CANCELLED",
        cancelReason: "Cancelada por cliente desde portal",
      },
      actor?.id ?? appointment.createdById
    );

    return {
      message: "Cita cancelada. El horario ya esta disponible para otros clientes.",
      appointment: updated,
    };
  },
};

// ── Email template ─────────────────────────────────────────────────────────────

function buildVerificationEmail(name: string, verifyUrl: string): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#09090b;font-family:system-ui,sans-serif;">
      <div style="max-width:480px;margin:40px auto;padding:0 16px;">
        <div style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:32px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-flex;width:48px;height:48px;background:#4f46e5;border-radius:12px;align-items:center;justify-content:center;">
              <span style="color:#fff;font-size:24px;">✂</span>
            </div>
            <h1 style="color:#f4f4f5;font-size:20px;font-weight:700;margin:12px 0 4px;">Verifica tu cuenta</h1>
            <p style="color:#71717a;font-size:13px;margin:0;">Barbershop Pro — Portal de clientes</p>
          </div>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Hola, <strong style="color:#f4f4f5;">${name}</strong>. Haz clic en el botón para verificar tu email.
          </p>
          <a href="${verifyUrl}" style="display:block;background:#4f46e5;color:#fff;text-align:center;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;margin-bottom:24px;">
            Verificar email
          </a>
          <p style="color:#52525b;font-size:12px;line-height:1.6;margin:0;">
            Si no creaste esta cuenta, ignora este correo.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

