import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { Observable, catchError, tap, throwError } from "rxjs";

type RequestWithUser = Request & {
  user?: {
    id?: string;
    sub?: string;
  };
};

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithUser>();
    const response = http.getResponse<Response>();
    const requestId = this.getRequestId(request);
    const startedAt = Date.now();

    response.setHeader("X-Request-ID", requestId);

    return next.handle().pipe(
      tap(() => {
        this.logRequest(
          request,
          response.statusCode,
          Date.now() - startedAt,
          requestId
        );
      }),
      catchError(error => {
        const statusCode =
          typeof error?.getStatus === "function" ? error.getStatus() : 500;
        this.logRequest(
          request,
          statusCode,
          Date.now() - startedAt,
          requestId,
          true
        );
        return throwError(() => error);
      })
    );
  }

  private getRequestId(request: Request) {
    const headerRequestId = request.headers["x-request-id"];
    return Array.isArray(headerRequestId)
      ? headerRequestId[0]
      : (headerRequestId ?? randomUUID());
  }

  private logRequest(
    request: RequestWithUser,
    statusCode: number,
    durationMs: number,
    requestId: string,
    isError = false
  ) {
    const userId = request.user?.id ?? request.user?.sub ?? "anonymous";
    const message = `${request.method} ${request.originalUrl} userId=${userId} status=${statusCode} duration=${durationMs}ms requestId=${requestId}`;

    if (isError) {
      this.logger.error(message);
      return;
    }

    this.logger.log(message);
  }
}
