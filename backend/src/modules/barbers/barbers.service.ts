import { randomBytes } from "node:crypto";
import { AppError } from "../../lib/errors.js";
import { hashPassword } from "../../utils/password.js";
import { barbersRepository } from "./barbers.repository.js";
import { CreateBarberSchema, OnboardWorkerSchema, UpdateBarberSchema } from "./barbers.schema.js";

function buildTemporaryPassword(): string {
  const random = randomBytes(9).toString("base64url");
  return `Tmp-${random}#A1`;
}

function buildDefaultNameFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? "cliente";
  const normalized = localPart.replace(/[._-]+/g, " ").trim();
  if (!normalized) return "Cliente Portal";
  return normalized
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const barbersService = {
  list(businessId: string) {
    return barbersRepository.list(businessId);
  },
  listAvailableUsers(businessId: string, search?: string) {
    return barbersRepository.listAvailableUsers(businessId, search?.trim());
  },
  async onboardWorker(businessId: string, data: unknown) {
    const payload = OnboardWorkerSchema.parse(data);
    const normalizedEmail = payload.email.trim().toLowerCase();
    const name = payload.name?.trim() || buildDefaultNameFromEmail(normalizedEmail);

    const [existingUser, business] = await Promise.all([
      barbersRepository.findUserByEmail(normalizedEmail, businessId),
      barbersRepository.findBusinessWithPlan(businessId),
    ]);

    if (!business) {
      throw new AppError("BUSINESS_NOT_FOUND", 404);
    }
    if (existingUser) {
      throw new AppError(
        "USER_ALREADY_EXISTS",
        409,
        "Ya existe un trabajador con este email en esta barberia."
      );
    }

    if (payload.createBarberProfile && payload.role === "BARBER") {
      const currentCount = await barbersRepository.countActive(businessId);
      if (currentCount >= business.plan.maxBarbers) {
        throw new AppError(
          "PLAN_LIMIT_EXCEEDED",
          403,
          `Tu plan permite maximo ${business.plan.maxBarbers} barbero(s) activo(s).`
        );
      }
    }

    const temporaryPassword = buildTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    const user = await barbersRepository.createUser({
      businessId,
      name,
      email: normalizedEmail,
      passwordHash,
      role: payload.role,
      active: payload.active,
      photoUrl: payload.photoUrl ?? null,
    });

    const shouldCreateBarber = payload.createBarberProfile && payload.role === "BARBER";
    const barber = shouldCreateBarber
      ? await barbersRepository.create({
          businessId,
          userId: user.id,
          specialty: payload.specialty,
          commissionPercentage: payload.commissionPercentage,
          active: payload.active,
        })
      : null;

    return {
      user,
      barber,
      temporaryPassword,
      onboardingHint:
        "Comparte esta contrasena temporal con el trabajador y luego debe cambiarla o usar recuperacion de contrasena.",
    };
  },
  async create(businessId: string, data: unknown) {
    const payload = CreateBarberSchema.parse(data);
    const { photoUrl, ...barberPayload } = payload;

    const [business, currentCount, user, existingBarber] = await Promise.all([
      barbersRepository.findBusinessWithPlan(businessId),
      barbersRepository.countActive(businessId),
      barbersRepository.findUserById(payload.userId, businessId),
      barbersRepository.findBarberByUserId(payload.userId, businessId),
    ]);

    if (!business) {
      throw new AppError("BUSINESS_NOT_FOUND", 404);
    }
    if (!user) {
      throw new AppError("USER_NOT_FOUND", 404, "El usuario seleccionado no existe en este negocio.");
    }
    if (!user.active) {
      throw new AppError("USER_INACTIVE", 400, "El usuario seleccionado esta inactivo.");
    }
    if (existingBarber) {
      throw new AppError("BARBER_USER_ALREADY_ASSIGNED", 409, "Este usuario ya esta asignado como barbero.");
    }

    if (currentCount >= business.plan.maxBarbers) {
      throw new AppError(
        "PLAN_LIMIT_EXCEEDED",
        403,
        `Tu plan permite máximo ${business.plan.maxBarbers} barbero(s) activo(s). Actualiza tu plan para agregar más.`,
      );
    }

    const created = await barbersRepository.create({ ...barberPayload, businessId });
    if (photoUrl !== undefined) {
      await barbersRepository.updateUserPhoto(payload.userId, businessId, photoUrl ?? null);
      return barbersRepository.getById(created.id, businessId);
    }
    return created;
  },
  async update(id: string, businessId: string, data: unknown) {
    const payload = UpdateBarberSchema.parse(data);
    const { photoUrl, ...barberPayload } = payload;
    const existing = await barbersRepository.getById(id, businessId);
    if (!existing) {
      throw new AppError("BARBER_NOT_FOUND", 404);
    }
    const result = await barbersRepository.update(id, businessId, barberPayload);
    if (result.count === 0) {
      throw new AppError("BARBER_NOT_FOUND", 404);
    }
    if (photoUrl !== undefined) {
      await barbersRepository.updateUserPhoto(existing.userId, businessId, photoUrl ?? null);
    }
    return barbersRepository.getById(id, businessId);
  },
  async remove(id: string, businessId: string) {
    const result = await barbersRepository.softDelete(id, businessId);
    if (result.count === 0) {
      throw new AppError("BARBER_NOT_FOUND", 404);
    }
  },
};
