import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";
import { isAllowedOrigin } from "../utils/origins.js";

interface AuthPayload extends JwtPayload {
  sub: string;
  businessId: string;
  role: string;
}

interface CustomerAuthPayload extends JwtPayload {
  sub: string;
  type: "customer";
}

let io: SocketIOServer | null = null;

export function createSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        callback(null, isAllowedOrigin(origin));
      },
      credentials: true,
    },
    path: "/socket.io",
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      next(new Error("Authentication required"));
      return;
    }

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
      socket.data.authType = "staff";
      socket.data.businessId = payload.businessId;
      socket.data.userId = payload.sub;
      next();
      return;
    } catch {
      // fallback to customer token
    }

    try {
      if (!env.CUSTOMER_JWT_SECRET) {
        next(new Error("Invalid token"));
        return;
      }
      const customerPayload = jwt.verify(token, env.CUSTOMER_JWT_SECRET) as CustomerAuthPayload;
      if (customerPayload.type !== "customer") {
        next(new Error("Invalid token"));
        return;
      }

      socket.data.authType = "customer";
      socket.data.customerAccountId = customerPayload.sub;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    if (socket.data.authType === "staff") {
      const businessId: string = socket.data.businessId;
      void socket.join(`business:${businessId}`);

      if (env.NODE_ENV === "development") {
        console.log(`[WS] Staff connected - business:${businessId} socket:${socket.id}`);
      }
    }

    if (socket.data.authType === "customer") {
      const customerAccountId: string = socket.data.customerAccountId;
      void socket.join(`customer:${customerAccountId}`);

      if (env.NODE_ENV === "development") {
        console.log(`[WS] Customer connected - account:${customerAccountId} socket:${socket.id}`);
      }
    }

    socket.on("disconnect", () => {
      if (env.NODE_ENV === "development") {
        console.log(`[WS] Client disconnected - socket:${socket.id}`);
      }
    });
  });

  return io;
}

export function emitToBusiness(businessId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`business:${businessId}`).emit(event, data);
}

export function emitToCustomerAccount(customerAccountId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`customer:${customerAccountId}`).emit(event, data);
}
