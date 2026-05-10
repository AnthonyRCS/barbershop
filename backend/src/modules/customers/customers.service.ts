import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { sendMail } from "../../lib/mailer.js";
import { getPublicFrontendUrl } from "../../utils/origins.js";
import { hashToken, generateToken } from "../../utils/token.js";
import { customersRepository } from "./customers.repository.js";
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  CustomerListQuerySchema,
  LookupCustomerSchema,
  HistoryQuerySchema,
  InvitePortalSchema,
} from "./customers.schema.js";

export const customersService = {
  async list(businessId: string, rawQuery: unknown) {
    const query = CustomerListQuerySchema.parse(rawQuery);
    return customersRepository.list(businessId, query);
  },

  async getById(id: string, businessId: string) {
    const customer = await customersRepository.getById(id, businessId);
    if (!customer) throw new AppError("CUSTOMER_NOT_FOUND", 404, "Cliente no encontrado");
    return customer;
  },

  async create(businessId: string, data: unknown, createdByUserId: string) {
    const payload = CreateCustomerSchema.parse(data);

    // Duplicate detection before insert
    if (payload.phone || payload.email) {
      const dupes = await customersRepository.lookup(businessId, {
        phone: payload.phone ?? undefined,
        email: payload.email ?? undefined,
      });
      if (dupes.length > 0) {
        throw new AppError(
          "CUSTOMER_DUPLICATE",
          409,
          "Ya existe un cliente con ese teléfono o email en este negocio",
          { matches: dupes },
        );
      }
    }

    return customersRepository.create({
      ...payload,
      businessId,
      createdByUserId,
    });
  },

  async update(id: string, businessId: string, data: unknown) {
    const payload = UpdateCustomerSchema.parse(data);

    // If phone or email changes, check for duplicates
    if (payload.phone !== undefined || payload.email !== undefined) {
      const dupes = await customersRepository.lookup(businessId, {
        phone: typeof payload.phone === "string" ? payload.phone : undefined,
        email: typeof payload.email === "string" ? payload.email : undefined,
        excludeId: id,
      });
      if (dupes.length > 0) {
        throw new AppError(
          "CUSTOMER_DUPLICATE",
          409,
          "Ya existe otro cliente con ese teléfono o email",
          { matches: dupes },
        );
      }
    }

    let result;
    try {
      result = await customersRepository.update(id, businessId, payload as Prisma.CustomerUncheckedUpdateInput);
    } catch (err) {
      // Catch Prisma unique constraint error (P2002) as fallback
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new AppError("CUSTOMER_DUPLICATE", 409, "Teléfono o email ya usado por otro cliente");
      }
      throw err;
    }

    if (result.count === 0) throw new AppError("CUSTOMER_NOT_FOUND", 404, "Cliente no encontrado");
    return customersRepository.getById(id, businessId);
  },

  async remove(id: string, businessId: string) {
    const result = await customersRepository.softDelete(id, businessId);
    if (result.count === 0) throw new AppError("CUSTOMER_NOT_FOUND", 404, "Cliente no encontrado");
  },

  async getHistory(id: string, businessId: string, rawQuery: unknown) {
    // Ensure customer exists in this business
    const exists = await customersRepository.getById(id, businessId);
    if (!exists) throw new AppError("CUSTOMER_NOT_FOUND", 404, "Cliente no encontrado");

    const { page, limit } = HistoryQuerySchema.parse(rawQuery);
    return customersRepository.getHistory(id, businessId, page, limit);
  },

  async lookup(businessId: string, data: unknown) {
    const payload = LookupCustomerSchema.parse(data);
    return customersRepository.lookup(businessId, payload);
  },

  async recalculateStats(id: string, businessId: string) {
    const exists = await customersRepository.getById(id, businessId);
    if (!exists) throw new AppError("CUSTOMER_NOT_FOUND", 404, "Cliente no encontrado");
    await customersRepository.recalculateStats(id, businessId);
    return customersRepository.getById(id, businessId);
  },

  async inviteToPortal(businessId: string, userId: string, data: unknown) {
    const payload = InvitePortalSchema.parse(data);
    const customer = await customersRepository.getById(payload.customerId, businessId);
    if (!customer) throw new AppError("CUSTOMER_NOT_FOUND", 404, "Cliente no encontrado");

    const rawToken = generateToken(24);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await customersRepository.createInvitation({
      businessId,
      customerId: payload.customerId,
      email: payload.email,
      tokenHash,
      expiresAt,
      createdById: userId,
    });

    const registerUrl = `${getPublicFrontendUrl()}/customer/register?inviteToken=${rawToken}&email=${encodeURIComponent(payload.email)}`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h2>Invitacion al portal de clientes</h2>
        <p>Hola ${customer.name}, tu barberia te invito a crear tu acceso para gestionar citas.</p>
        <p><a href="${registerUrl}" style="background:#0f766e;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;">Crear acceso</a></p>
        <p>Este enlace expira en 7 dias.</p>
      </div>
    `;

    await sendMail({
      to: payload.email,
      subject: "Invitacion al portal de clientes",
      html,
    });

    return { message: "Invitacion enviada", expiresAt };
  },
};
