import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { randomUUID } from "crypto";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { routes } from "./routes/index.js";
import { platformRoutes } from "./routes/platform.routes.js";
import { isAllowedOrigin } from "./utils/origins.js";

export const app = express();

app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// Attach a unique X-Request-Id to every request for end-to-end tracing
app.use((req: Request, res: Response, next: NextFunction) => {
  const id = (req.headers["x-request-id"] as string | undefined) ?? randomUUID();
  req.headers["x-request-id"] = id;
  res.setHeader("X-Request-Id", id);
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

if (env.NODE_ENV === "development") {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });
}

// Health check — always returns 200 so load balancers and uptime monitors can probe
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/v1/platform", platformRoutes);
app.use("/api/v1", routes);
app.use(errorMiddleware);
