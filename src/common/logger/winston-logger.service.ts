import { Injectable, LoggerService } from "@nestjs/common";
import { createLogger, format, transports, Logger } from "winston";

@Injectable()
export class WinstonLoggerService implements LoggerService {
  private readonly logger: Logger;

  constructor() {
    const isProduction = process.env.NODE_ENV === "production";

    this.logger = createLogger({
      level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
      defaultMeta: { service: "bibliotech-api" },
      format: isProduction
        ? format.combine(format.timestamp(), format.json())
        : format.combine(
            format.timestamp({ format: "HH:mm:ss" }),
            format.colorize({ all: true }),
            format.printf(({ timestamp, level, message, context, ...meta }) => {
              const ctx = context ? `[${context}]` : "";
              const extra = Object.keys(meta).length > 1
                ? ` ${JSON.stringify(meta)}`
                : "";
              return `${timestamp} ${level} ${ctx} ${message}${extra}`;
            }),
          ),
      transports: [new transports.Console()],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { context, trace });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }
}
