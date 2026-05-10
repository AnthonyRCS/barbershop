# Backend API - Phase 1 (Barbershop SaaS)

Base URL: /api/v1
Auth: Bearer token (staff)

## Inventory

### GET /inventory/products
Response: Product[]

### POST /inventory/products
Body:
{
  "name": "Cera mate",
  "sku": "CERA-001",
  "description": "Acabado natural",
  "stock": 20,
  "minStock": 5,
  "unitCost": 12,
  "salePrice": 20
}

### PUT /inventory/products/:id
Body: partial de POST

### DELETE /inventory/products/:id
Response: 204

### GET /inventory/movements
Response: movimientos recientes con producto y usuario

### POST /inventory/movements
Body:
{
  "productId": "cuid",
  "type": "IN",
  "quantity": 10,
  "reason": "Compra proveedor"
}

## Sales & Cash

### GET /sales
Response: Sale[] con items

### POST /sales
Body:
{
  "customerId": "cuid-opcional",
  "discount": 5,
  "paymentMethod": "CASH",
  "notes": "Venta mostrador",
  "items": [
    {
      "itemType": "SERVICE",
      "serviceId": "cuid-opcional",
      "barberId": "cuid-opcional",
      "name": "Corte clásico",
      "quantity": 1,
      "unitPrice": 30
    },
    {
      "itemType": "PRODUCT",
      "productId": "cuid-opcional",
      "name": "Cera mate",
      "quantity": 1,
      "unitPrice": 20
    }
  ]
}

### GET /sales/cash-closings
Response: CashClosing[]

### POST /sales/cash-closings
Body:
{
  "openingCash": 100,
  "countedCash": 350,
  "notes": "Turno mañana"
}

## Schedule (Blocks + Waitlist)

### GET /schedule/blocks
Response: ScheduleBlock[]

### POST /schedule/blocks
Body:
{
  "barberId": "cuid",
  "startsAt": "2026-05-08T15:00:00.000Z",
  "endsAt": "2026-05-08T16:00:00.000Z",
  "reason": "Almuerzo"
}

### DELETE /schedule/blocks/:id
Response: 204

### GET /schedule/waitlist
Response: WaitlistEntry[]

### POST /schedule/waitlist
Body:
{
  "customerId": "cuid",
  "barberId": "cuid-opcional",
  "serviceId": "cuid-opcional",
  "preferredDate": "2026-05-09T00:00:00.000Z",
  "preferredTime": "17:30",
  "notes": "Prefiere tarde"
}

### PATCH /schedule/waitlist/:id/status
Body:
{
  "status": "CONTACTED"
}
Values: PENDING | CONTACTED | BOOKED | CANCELLED

## Dashboard

### GET /dashboard/summary
Response:
{
  "salesMonth": { "total": 0, "count": 0 },
  "appointmentsToday": 0,
  "noShowsMonth": 0,
  "lowStockProducts": 0,
  "waitlistPending": 0
}

## Errors
Formato:
{
  "error": {
    "code": "ERROR_CODE",
    "message": "mensaje"
  }
}
