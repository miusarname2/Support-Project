import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("Unhandled error:", err);

  // Zod validation errors
  if (err instanceof ZodError) {
    const messages = err.errors.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    );
    res.status(400).json({
      success: false,
      error: "Validation error",
      details: messages,
    });
    return;
  }

  // Generic errors
  const statusCode = (err as any).statusCode || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}
