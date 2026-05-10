const http = require("http");

const business = { id: "cmockbiz123456789", name: "Barberia El Maestro", slug: "el-maestro", status: "ACTIVE" };

const appointments = [
  {
    id: "capp1",
    customerId: "ccust1",
    barberId: "cbarb1",
    serviceId: "cserv1",
    appointmentDate: new Date().toISOString(),
    startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
    status: "PENDING",
    finalPrice: "15",
  },
  {
    id: "capp2",
    customerId: "ccust2",
    barberId: "cbarb2",
    serviceId: "cserv2",
    appointmentDate: new Date().toISOString(),
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    status: "COMPLETED",
    finalPrice: "10",
  },
];

const customers = [
  { id: "ccust1", name: "Juan Perez", phone: "+51911111111", email: "juan@test.com" },
  { id: "ccust2", name: "Miguel Diaz", phone: "+51922222222", email: "miguel@test.com" },
];

const barbers = [
  { id: "cbarb1", userId: "u1", specialty: "Fade", active: true },
  { id: "cbarb2", userId: "u2", specialty: "Classic", active: true },
];

const services = [
  { id: "cserv1", name: "Corte", durationMinutes: 30, price: "15", active: true },
  { id: "cserv2", name: "Barba", durationMinutes: 20, price: "10", active: true },
];

function send(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }

  const url = req.url || "";

  if (req.method === "POST" && url === "/api/v1/auth/login") {
    send(res, 200, {
      token: "mock-jwt-token",
      user: {
        id: "u-owner",
        name: "Owner Maestro",
        role: "OWNER",
        business,
      },
    });
    return;
  }

  if (req.method === "GET" && url.startsWith("/api/v1/appointments")) {
    send(res, 200, appointments);
    return;
  }

  if (req.method === "GET" && url.startsWith("/api/v1/customers")) {
    send(res, 200, customers);
    return;
  }

  if (req.method === "GET" && url.startsWith("/api/v1/barbers")) {
    send(res, 200, barbers);
    return;
  }

  if (req.method === "GET" && url.startsWith("/api/v1/services")) {
    send(res, 200, services);
    return;
  }

  if (req.method === "GET" && url.startsWith("/api/v1/business/me")) {
    send(res, 200, business);
    return;
  }

  if (req.method === "POST" && url.startsWith("/api/v1/appointments")) {
    send(res, 201, { id: "capp-new" });
    return;
  }

  send(res, 404, { error: { code: "NOT_FOUND", message: "Not found" } });
});

const PORT = 3099;
server.listen(PORT, () => {
  console.log(`Mock backend listening on ${PORT}`);
});