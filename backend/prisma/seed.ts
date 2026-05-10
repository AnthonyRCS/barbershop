import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const basicPlan = await prisma.plan.upsert({
    where: { id: "plan_basic_seed" },
    update: {},
    create: {
      id: "plan_basic_seed",
      name: "Básico",
      price: "29.99",
      maxBarbers: 3,
      maxAppointmentsPerMonth: 100,
      features: { reports: false, reminders: false },
      active: true,
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { id: "plan_pro_seed" },
    update: {},
    create: {
      id: "plan_pro_seed",
      name: "Pro",
      price: "79.99",
      maxBarbers: 10,
      maxAppointmentsPerMonth: 500,
      features: { reports: true, reminders: true },
      active: true,
    },
  });

  const business = await prisma.business.upsert({
    where: { slug: "el-maestro" },
    update: {},
    create: {
      name: "Barbería El Maestro",
      slug: "el-maestro",
      phone: "+51999999999",
      email: "owner@elmaestro.com",
      address: "Av. Principal 123",
      planId: basicPlan.id,
      status: "ACTIVE",
      subscriptions: {
        create: {
          planId: basicPlan.id,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: "ACTIVE",
        },
      },
    },
  });

  const ownerPassword = await bcrypt.hash("Admin123!", 12);

  const owner = await prisma.user.upsert({
    where: { email_businessId: { email: "owner@elmaestro.com", businessId: business.id } },
    update: {},
    create: {
      businessId: business.id,
      name: "Owner Maestro",
      email: "owner@elmaestro.com",
      passwordHash: ownerPassword,
      role: "OWNER",
      active: true,
    },
  });

  const barberUsers = await Promise.all([
    prisma.user.upsert({
      where: { email_businessId: { email: "barber1@elmaestro.com", businessId: business.id } },
      update: {},
      create: {
        businessId: business.id,
        name: "Carlos Fade",
        email: "barber1@elmaestro.com",
        passwordHash: ownerPassword,
        role: "BARBER",
      },
    }),
    prisma.user.upsert({
      where: { email_businessId: { email: "barber2@elmaestro.com", businessId: business.id } },
      update: {},
      create: {
        businessId: business.id,
        name: "Luis Blade",
        email: "barber2@elmaestro.com",
        passwordHash: ownerPassword,
        role: "BARBER",
      },
    }),
  ]);

  const barbers = await Promise.all(
    barberUsers.map((user, index) =>
      prisma.barber.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          businessId: business.id,
          userId: user.id,
          specialty: index === 0 ? "Fade" : "Classic",
          commissionPercentage: index === 0 ? "40" : "35",
          active: true,
        },
      }),
    ),
  );

  const services = await Promise.all([
    prisma.service.create({
      data: { businessId: business.id, name: "Corte", durationMinutes: 30, price: "15", active: true },
    }).catch(() => prisma.service.findFirstOrThrow({ where: { businessId: business.id, name: "Corte" } })),
    prisma.service.create({
      data: { businessId: business.id, name: "Barba", durationMinutes: 20, price: "10", active: true },
    }).catch(() => prisma.service.findFirstOrThrow({ where: { businessId: business.id, name: "Barba" } })),
    prisma.service.create({
      data: { businessId: business.id, name: "Corte+Barba", durationMinutes: 45, price: "22", active: true },
    }).catch(() => prisma.service.findFirstOrThrow({ where: { businessId: business.id, name: "Corte+Barba" } })),
  ]);

  for (let day = 0; day <= 6; day += 1) {
    await prisma.businessHours.upsert({
      where: { businessId_dayOfWeek: { businessId: business.id, dayOfWeek: day } },
      update: {
        isOpen: day !== 0,
        openTime: "09:00",
        closeTime: "20:00",
      },
      create: {
        businessId: business.id,
        dayOfWeek: day,
        isOpen: day !== 0,
        openTime: "09:00",
        closeTime: "20:00",
      },
    });

    for (const barber of barbers) {
      await prisma.barberSchedule.upsert({
        where: { barberId_dayOfWeek: { barberId: barber.id, dayOfWeek: day } },
        update: { startTime: "09:00", endTime: "20:00", isAvailable: day !== 0 },
        create: {
          businessId: business.id,
          barberId: barber.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "20:00",
          isAvailable: day !== 0,
        },
      });
    }
  }

  const customers = await Promise.all(
    [
      ["Juan Perez", "+51911111111"],
      ["Miguel Diaz", "+51922222222"],
      ["Pedro Silva", "+51933333333"],
      ["Diego Ramos", "+51944444444"],
      ["Alex Vega", "+51955555555"],
    ].map(([name, phone]) =>
      prisma.customer.create({
        data: {
          businessId: business.id,
          name,
          phone,
        },
      }).catch(() => prisma.customer.findFirstOrThrow({ where: { businessId: business.id, phone } })),
    ),
  );

  const now = new Date();

  await prisma.appointment.createMany({
    data: [
      {
        businessId: business.id,
        customerId: customers[0].id,
        barberId: barbers[0].id,
        serviceId: services[0].id,
        appointmentDate: now,
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 90 * 60 * 1000),
        status: "PENDING",
        finalPrice: "15",
        createdById: owner.id,
      },
      {
        businessId: business.id,
        customerId: customers[1].id,
        barberId: barbers[1].id,
        serviceId: services[1].id,
        appointmentDate: now,
        startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 100 * 60 * 1000),
        status: "COMPLETED",
        finalPrice: "10",
        createdById: owner.id,
      },
      {
        businessId: business.id,
        customerId: customers[2].id,
        barberId: barbers[0].id,
        serviceId: services[2].id,
        appointmentDate: now,
        startTime: new Date(now.getTime() + 3 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        status: "CONFIRMED",
        finalPrice: "22",
        createdById: owner.id,
      },
    ],
    skipDuplicates: true,
  });

  // Platform superadmin seed
  const superadminPassword = await bcrypt.hash("SuperAdmin123!", 12);
  const superadmin = await prisma.platformUser.upsert({
    where: { email: "superadmin@barbershop.com" },
    update: {
      name: "Super Admin",
      passwordHash: superadminPassword,
      role: "SUPERADMIN",
      status: "ACTIVE",
    },
    create: {
      name: "Super Admin",
      email: "superadmin@barbershop.com",
      passwordHash: superadminPassword,
      role: "SUPERADMIN",
      status: "ACTIVE",
    },
  });

  console.log("Seed completed:", {
    basicPlan: basicPlan.id,
    proPlan: proPlan.id,
    business: business.id,
    superadmin: superadmin.email,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
