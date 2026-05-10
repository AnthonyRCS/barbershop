import bcrypt from "bcryptjs";
import { AppError } from "../../lib/errors.js";
import { createPlatformAuditLog } from "../../utils/platform-audit.js";
import {
  PlatformUserCreateInput,
  PlatformUserStatusInput,
  PlatformUserUpdateInput,
} from "./platform-users.schema.js";
import { platformUsersRepository } from "./platform-users.repository.js";

export const platformUsersService = {
  async list() {
    return platformUsersRepository.findAll();
  },

  async create(data: PlatformUserCreateInput, actorId: string) {
    const existing = await platformUsersRepository.findByEmail(data.email);
    if (existing) throw new AppError("CONFLICT", 409, "Email already in use");

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await platformUsersRepository.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
    });

    await createPlatformAuditLog({
      performedById: actorId,
      action: "PLATFORM_USER_CREATE",
      entity: "PlatformUser",
      entityId: user.id,
      after: { name: user.name, email: user.email, role: user.role },
    });

    return user;
  },

  async update(id: string, data: PlatformUserUpdateInput, actorId: string) {
    const existing = await platformUsersRepository.findById(id);
    if (!existing) throw new AppError("NOT_FOUND", 404, "Platform user not found");

    if (data.email && data.email !== existing.email) {
      const conflict = await platformUsersRepository.findByEmail(data.email);
      if (conflict) throw new AppError("CONFLICT", 409, "Email already in use");
    }

    const updated = await platformUsersRepository.update(id, data);

    await createPlatformAuditLog({
      performedById: actorId,
      action: "PLATFORM_USER_UPDATE",
      entity: "PlatformUser",
      entityId: id,
      before: existing,
      after: updated,
    });

    return updated;
  },

  async changeStatus(id: string, input: PlatformUserStatusInput, actorId: string) {
    const existing = await platformUsersRepository.findById(id);
    if (!existing) throw new AppError("NOT_FOUND", 404, "Platform user not found");

    if (id === actorId) throw new AppError("FORBIDDEN", 403, "Cannot change your own status");

    const updated = await platformUsersRepository.update(id, { status: input.status });

    await createPlatformAuditLog({
      performedById: actorId,
      action: "PLATFORM_USER_STATUS_CHANGE",
      entity: "PlatformUser",
      entityId: id,
      before: { status: existing.status },
      after: { status: input.status },
    });

    return updated;
  },
};
