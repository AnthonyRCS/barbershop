import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { CreateBlockSchema, CreateWaitlistSchema, UpdateWaitlistStatusSchema } from "./schedule.schema.js";

export const scheduleService = {
  listBlocks(businessId: string) {
    return prisma.scheduleBlock.findMany({ where: { businessId }, include: { barber: { include: { user: { select: { id: true, name: true } } } } }, orderBy: { startsAt: "asc" } });
  },
  async createBlock(businessId: string, data: unknown) {
    const payload = CreateBlockSchema.parse(data);
    if (new Date(payload.endsAt) <= new Date(payload.startsAt)) throw new AppError("INVALID_RANGE", 422, "Rango de horas invalido");
    return prisma.scheduleBlock.create({ data: { ...payload, businessId } });
  },
  async deleteBlock(id: string, businessId: string) {
    const result = await prisma.scheduleBlock.deleteMany({ where: { id, businessId } });
    if (result.count === 0) throw new AppError("BLOCK_NOT_FOUND", 404);
  },
  listWaitlist(businessId: string) {
    return prisma.waitlistEntry.findMany({
      where: { businessId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        barber: { include: { user: { select: { id: true, name: true } } } },
        service: { select: { id: true, name: true, durationMinutes: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    });
  },
  createWaitlist(businessId: string, data: unknown) {
    const payload = CreateWaitlistSchema.parse(data);
    return prisma.waitlistEntry.create({ data: { ...payload, preferredDate: payload.preferredDate ? new Date(payload.preferredDate) : undefined, businessId } });
  },
  async updateWaitlistStatus(id: string, businessId: string, data: unknown) {
    const payload = UpdateWaitlistStatusSchema.parse(data);
    const updated = await prisma.waitlistEntry.updateMany({ where: { id, businessId }, data: { status: payload.status } });
    if (updated.count === 0) throw new AppError("WAITLIST_NOT_FOUND", 404);
    return prisma.waitlistEntry.findFirst({ where: { id, businessId } });
  },
};
