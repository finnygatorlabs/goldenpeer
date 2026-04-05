import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { errorLogsTable } from "@workspace/db";
import { AuthRequest } from "./auth.js";

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : "INTERNAL_SERVER_ERROR";
  const userId = (req as AuthRequest).user?.userId || null;

  if (statusCode >= 500) {
    req.log?.error({ err }, `[ERROR] ${req.method} ${req.originalUrl}`);
    try {
      db.insert(errorLogsTable).values({
        user_id: userId,
        error_type: code,
        error_message: err.message,
        stack_trace: err.stack || null,
        context: { endpoint: req.originalUrl, method: req.method },
        severity: statusCode >= 500 ? "error" : "warning",
      }).catch(() => {});
    } catch {}
  }

  res.status(statusCode).json({
    error: code,
    message: statusCode >= 500 ? "An internal server error occurred" : err.message,
    ...(err instanceof AppError && err.details ? { details: err.details } : {}),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: "NOT_FOUND",
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}
