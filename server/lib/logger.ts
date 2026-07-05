import winston from "winston";

const redactKeys = new Set([
  "authorization",
  "apikey",
  "apiKey",
  "token",
  "password",
  "secret",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CINETPAY_API_KEY",
  "TWILIO_AUTH_TOKEN",
]);

function redact(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      redactKeys.has(key) || key.toLowerCase().includes("secret") || key.toLowerCase().includes("token")
        ? "[redacted]"
        : redact(item),
    ]),
  );
}

const jsonFormat = winston.format.printf(info => {
  const metadata = redact(info.metadata || {});
  return JSON.stringify({
    level: info.level,
    message: info.message,
    timestamp: info.timestamp,
    ...(metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {}),
  });
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.metadata({ fillExcept: ["level", "message", "timestamp"] }),
    jsonFormat,
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ["error", "warn"],
    }),
  ],
});

export function logError(message: string, error: unknown, metadata: Record<string, unknown> = {}) {
  logger.error(message, {
    ...metadata,
    error: error instanceof Error
      ? { name: error.name, message: error.message, stack: process.env.NODE_ENV === "production" ? undefined : error.stack }
      : error,
  });
}
