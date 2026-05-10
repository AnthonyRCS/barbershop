import { createServer } from "http";
import { networkInterfaces } from "os";
import { app } from "./src/app.js";
import { env } from "./src/config/env.js";
import { logger } from "./src/lib/logger.js";
import { createSocketServer } from "./src/lib/socket.js";
import { startSubscriptionExpiryJob } from "./src/utils/subscriptionExpiry.js";

function getNetworkIP(): string {
  const nets = networkInterfaces();
  for (const iface of Object.values(nets)) {
    for (const net of iface ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

const httpServer = createServer(app);
createSocketServer(httpServer);

startSubscriptionExpiryJob();

httpServer.listen(Number(env.PORT), "0.0.0.0", () => {
  const ip = getNetworkIP();
  const port = env.PORT;

  logger.info(`Barbershop API started`);
  logger.info(`  Local   → http://localhost:${port}`);
  logger.info(`  Network → http://${ip}:${port}`);
  logger.info(`  WS      → ws://${ip}:${port}`);
  logger.info(`  Env     → ${env.NODE_ENV}`);
});
