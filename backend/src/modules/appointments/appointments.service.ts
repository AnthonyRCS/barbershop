import { AppError } from "../../lib/errors.js";
import { emitToBusiness, emitToCustomerAccount } from "../../lib/socket.js";
import { sendMail, buildAppointmentConfirmationEmail, buildAppointmentCancellationEmail } from "../../lib/mailer.js";
import { createAuditLog } from "../../utils/audit.js";
import { addMinutes, getYearMonth } from "../../utils/time.js";
import { appointmentsRepository } from "./appointments.repository.js";
import { customersRepository } from "../customers/customers.repository.js";
import { AppointmentFilters, CreateAppointmentInput, UpdateAppointmentInput } from "./appointments.schema.js";

interface CreateAppointmentOptions {
  allowScheduleConflict?: boolean;
}

async function emitAppointmentToCustomer(businessId: string, appointment: { customerId: string } | null, event: string, data: unknown) {
  if (!appointment) return;
  const customerAccountId = await appointmentsRepository.findCustomerAccountIdByCustomerId(appointment.customerId, businessId);
  if (!customerAccountId) return;
  emitToCustomerAccount(customerAccountId, event, data);
}

export const appointmentsService = {
  list(businessId: string, filters: AppointmentFilters) {
    return appointmentsRepository.findByBusinessId(businessId, filters);
  },

  getById(id: string, businessId: string) {
    return appointmentsRepository.findById(id, businessId);
  },

  async createAppointment(data: CreateAppointmentInput, createdById: string, businessId: string, options?: CreateAppointmentOptions) {
    // Idempotency: if key was already used, return the existing appointment
    if (data.idempotencyKey) {
      const existing = await appointmentsRepository.findByIdempotencyKey(businessId, data.idempotencyKey);
      if (existing) return existing;
    }

    const { year, month } = getYearMonth(data.appointmentDate);

    const business = await appointmentsRepository.findBusinessWithActiveSubscriptionPlan(businessId);
    if (!business) {
      throw new AppError("BUSINESS_NOT_FOUND", 404);
    }

    const activeSubscription = business.subscriptions[0];
    if (!activeSubscription) {
      throw new AppError("SUBSCRIPTION_NOT_FOUND", 403, "No active subscription found");
    }

    const monthlyCount = await appointmentsRepository.countMonthly(businessId, year, month);
    if (monthlyCount >= activeSubscription.plan.maxAppointmentsPerMonth) {
      throw new AppError("PLAN_LIMIT_EXCEEDED", 403);
    }

    const service = await appointmentsRepository.findServiceById(data.serviceId, businessId);
    if (!service) {
      throw new AppError("SERVICE_NOT_FOUND", 404);
    }

    const endTime = addMinutes(data.startTime, service.durationMinutes);

    const barber = await appointmentsRepository.findBarberById(data.barberId, businessId);
    if (!barber) {
      throw new AppError("BARBER_NOT_FOUND", 404);
    }

    if (!options?.allowScheduleConflict) {
      const hasConflict = await appointmentsRepository.checkConflict(data.barberId, new Date(data.startTime), endTime);
      if (hasConflict) {
        throw new AppError("BARBER_SCHEDULE_CONFLICT", 409);
      }
    }

    const appointment = await appointmentsRepository.create({
      businessId,
      customerId: data.customerId,
      barberId: data.barberId,
      serviceId: data.serviceId,
      appointmentDate: new Date(data.appointmentDate),
      startTime: new Date(data.startTime),
      endTime,
      notes: data.notes,
      finalPrice: service.price,
      idempotencyKey: data.idempotencyKey,
      createdById,
    });

    // Fetch full appointment with relations for response and email
    const fullAppointment = await appointmentsRepository.findById(appointment.id, businessId);

    await createAuditLog({
      businessId,
      userId: createdById,
      action: "CREATE",
      entity: "Appointment",
      entityId: appointment.id,
      after: fullAppointment ?? undefined,
    });

    emitToBusiness(businessId, "appointment:created", fullAppointment);
    await emitAppointmentToCustomer(businessId, fullAppointment, "customer:appointment:created", fullAppointment);

    // Send confirmation email if customer has an email (best-effort, non-blocking)
    if (fullAppointment?.customer?.email) {
      sendMail({
        to: fullAppointment.customer.email,
        subject: "Cita confirmada",
        html: buildAppointmentConfirmationEmail({
          customerName: fullAppointment.customer.name,
          barberName: fullAppointment.barber?.user?.name ?? "Tu barbero",
          serviceName: fullAppointment.service?.name ?? "Servicio",
          appointmentDate: fullAppointment.startTime,
          durationMinutes: fullAppointment.service?.durationMinutes ?? 0,
          price: Number(fullAppointment.finalPrice ?? 0),
        }),
      }).catch(() => {/* ignore email errors */});
    }

    return fullAppointment;
  },

  async updateAppointment(id: string, businessId: string, data: UpdateAppointmentInput, updatedById: string) {
    const current = await appointmentsRepository.findById(id, businessId);
    if (!current) {
      throw new AppError("APPOINTMENT_NOT_FOUND", 404);
    }

    const nextStart = data.startTime ? new Date(data.startTime) : current.startTime;
    const nextServiceId = data.serviceId ?? current.serviceId;
    const service = await appointmentsRepository.findServiceById(nextServiceId, businessId);
    if (!service) {
      throw new AppError("SERVICE_NOT_FOUND", 404);
    }

    const nextEnd = addMinutes(nextStart.toISOString(), service.durationMinutes);
    const nextBarberId = data.barberId ?? current.barberId;

    if (data.customerId) {
      const customer = await appointmentsRepository.findCustomerById(data.customerId, businessId);
      if (!customer) {
        throw new AppError("CUSTOMER_NOT_FOUND", 404);
      }
    }

    if (data.barberId) {
      const barber = await appointmentsRepository.findBarberById(data.barberId, businessId);
      if (!barber) {
        throw new AppError("BARBER_NOT_FOUND", 404);
      }
    }

    const hasConflict = await appointmentsRepository.checkConflict(nextBarberId, nextStart, nextEnd, id);
    if (hasConflict) {
      throw new AppError("BARBER_SCHEDULE_CONFLICT", 409);
    }

    const updateResult = await appointmentsRepository.update(id, businessId, {
      customer: data.customerId ? { connect: { id: data.customerId } } : undefined,
      barber: data.barberId ? { connect: { id: data.barberId } } : undefined,
      service: data.serviceId ? { connect: { id: data.serviceId } } : undefined,
      appointmentDate: data.appointmentDate ? new Date(data.appointmentDate) : undefined,
      startTime: nextStart,
      endTime: nextEnd,
      status: data.status,
      notes: data.notes,
      cancelReason: data.cancelReason,
      finalPrice: service.price,
    });

    if (updateResult.count === 0) {
      throw new AppError("APPOINTMENT_NOT_FOUND", 404);
    }

    const after = await appointmentsRepository.findById(id, businessId);

    await createAuditLog({
      businessId,
      userId: updatedById,
      action: data.status === "CANCELLED" ? "CANCEL" : "UPDATE",
      entity: "Appointment",
      entityId: id,
      before: current,
      after: after ?? undefined,
    });

    emitToBusiness(businessId, "appointment:updated", after);
    await emitAppointmentToCustomer(businessId, after, "customer:appointment:updated", after);

    // Recalculate customer stats when appointment is completed
    if (data.status === "COMPLETED") {
      await customersRepository.recalculateStats(current.customerId, businessId);
    }

    // Send cancellation email if cancelled and customer has email
    if (data.status === "CANCELLED" && after?.customer?.email) {
      sendMail({
        to: after.customer.email,
        subject: "Cita cancelada",
        html: buildAppointmentCancellationEmail({
          customerName: after.customer.name,
          barberName: after.barber?.user?.name ?? "Tu barbero",
          serviceName: after.service?.name ?? "Servicio",
          appointmentDate: after.startTime,
          reason: data.cancelReason,
        }),
      }).catch(() => {/* ignore email errors */});
    }

    return after;
  },

  async deleteAppointment(id: string, businessId: string, deletedById: string) {
    const current = await appointmentsRepository.findById(id, businessId);
    if (!current) {
      throw new AppError("APPOINTMENT_NOT_FOUND", 404);
    }

    const result = await appointmentsRepository.softDelete(id, businessId);
    if (result.count === 0) {
      throw new AppError("APPOINTMENT_NOT_FOUND", 404);
    }

    await createAuditLog({
      businessId,
      userId: deletedById,
      action: "DELETE",
      entity: "Appointment",
      entityId: id,
      before: current,
    });

    emitToBusiness(businessId, "appointment:deleted", { id });
    await emitAppointmentToCustomer(businessId, current, "customer:appointment:deleted", { id });
  },
};
