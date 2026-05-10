# SaaS Multi-Tenant Barbershop Platform

Monorepo con `backend` (Express + Prisma + PostgreSQL) y `frontend` (Next.js 15 + NextAuth v5).

## Requisitos

- Node.js 20+
- PostgreSQL 15+

## Estructura

- `backend/`: API REST, auth JWT, tenant isolation, Prisma ORM
- `frontend/`: App Router, dashboard, calendario de citas, CRUD base

## Setup rápido

1. Configurar variables de entorno:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

2. Instalar dependencias:

```bash
cd backend && npm install
cd ../frontend && npm install
```

3. Preparar base de datos en backend:

```bash
cd backend
npm run prisma:generate
npx prisma migrate dev --name init
npm run prisma:seed
```

4. Iniciar backend:

```bash
cd backend
npm run dev
```

5. Iniciar frontend:

```bash
cd frontend
npm run dev
```

## Validación de tipos

```bash
cd backend && npm run typecheck
cd ../frontend && npm run typecheck
```

## Credenciales seed

- Email: `owner@elmaestro.com`
- Password: `Admin123!`
- Business slug: `el-maestro`

## Seguridad aplicada

- Tenant isolation con `businessId` en queries
- JWT auth middleware
- RBAC por roles
- `helmet` + CORS restrictivo
- Rate limit en `/api/v1/auth/login`
- Soft delete en entidades principales
- Auditoría no bloqueante (`audit_logs`)