import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

export function errorMiddleware(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.payload ? { payload: error.payload } : {}),
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.flatten(),
      },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 — unique constraint
    if (error.code === "P2002") {
      res.status(409).json({
        error: { code: "UNIQUE_CONSTRAINT", message: "Unique constraint failed" },
      });
      return;
    }
    // P2025 — record not found (e.g. update/delete on non-existent row)
    if (error.code === "P2025") {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Record not found" },
      });
      return;
    }
    // P2003 — foreign key constraint
    if (error.code === "P2003") {
      res.status(409).json({
        error: { code: "FOREIGN_KEY_CONSTRAINT", message: "Related record not found" },
      });
      return;
    }
    // P2011 — null constraint violation
    if (error.code === "P2011") {
      res.status(422).json({
        error: { code: "NULL_CONSTRAINT", message: "Required field is null" },
      });
      return;
    }
    // P2014 — required relation violation
    if (error.code === "P2014") {
      res.status(422).json({
        error: { code: "RELATION_CONSTRAINT", message: "Required relation violated" },
      });
      return;
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    res.status(422).json({
      error: { code: "PRISMA_VALIDATION", message: "Invalid query parameters" },
    });
    return;
  }

  const requestId = req.headers["x-request-id"] as string | undefined;
  logger.error(
    {
      requestId,
      method: req.method,
      path: req.path,
      err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    },
    "Unhandled server error"
  );

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        process.env.NODE_ENV === "production"
          ? "Something went wrong"
          : error instanceof Error
            ? error.message
            : "Something went wrong",
    },
  });
}
