import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Request, Response } from "express";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const error = this.normalizeException(exception);

    if (error.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        error.error,
        exception instanceof Error ? exception.stack : undefined
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} -> ${error.statusCode}: ${error.error}`
      );
    }

    response.status(error.statusCode).json({
      success: false,
      error: error.error,
      code: error.code,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      details: error.details,
    });
  }

  private normalizeException(exception: unknown): {
    statusCode: number;
    error: string;
    code: string;
    details?: unknown;
  } {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.mapPrismaError(exception);
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === "object" && response !== null) {
        const payload = response as {
          message?: unknown;
          error?: string;
          code?: string;
        };
        return {
          statusCode,
          error: Array.isArray(payload.message)
            ? "Erreur de validation"
            : (payload.error ?? exception.message),
          code: payload.code ?? this.httpCodeToErrorCode(statusCode),
          details: payload.message,
        };
      }

      return {
        statusCode,
        error: exception.message,
        code: this.httpCodeToErrorCode(statusCode),
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: "Erreur interne du serveur",
      code: "INTERNAL_SERVER_ERROR",
    };
  }

  private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError) {
    switch (exception.code) {
      case "P2002":
        return {
          statusCode: HttpStatus.CONFLICT,
          error: "Cette ressource existe deja",
          code: "RESOURCE_ALREADY_EXISTS",
          details: exception.meta,
        };
      case "P2025":
        return {
          statusCode: HttpStatus.NOT_FOUND,
          error: "Ressource introuvable",
          code: "RESOURCE_NOT_FOUND",
          details: exception.meta,
        };
      case "P2003":
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: "Reference invalide vers une ressource liee",
          code: "FOREIGN_KEY_CONSTRAINT",
          details: exception.meta,
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: "Erreur base de donnees",
          code: "DATABASE_ERROR",
          details: { prismaCode: exception.code },
        };
    }
  }

  private httpCodeToErrorCode(statusCode: number) {
    if (statusCode === new ConflictException().getStatus()) {
      return "CONFLICT";
    }

    return HttpStatus[statusCode] ?? "HTTP_ERROR";
  }
}
