import type { Response } from "express";

export function ok<T>(res: Response, data: T, message = "OK", status = 200) {
  return res.status(status).json({ data, message });
}

export function fail(
  res: Response,
  code: string,
  message: string,
  status = 400,
  details?: unknown[],
) {
  return res.status(status).json({
    error: message,
    code,
    details: details || undefined,
  });
}
