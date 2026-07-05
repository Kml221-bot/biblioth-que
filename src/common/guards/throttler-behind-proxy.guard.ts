import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(
    request: Record<string, unknown>
  ): Promise<string> {
    const headers = request.headers as
      | Record<string, string | string[] | undefined>
      | undefined;
    const forwardedFor = headers?.["x-forwarded-for"];

    if (typeof forwardedFor === "string") {
      return forwardedFor.split(",")[0].trim();
    }

    if (Array.isArray(forwardedFor) && typeof forwardedFor[0] === "string") {
      return forwardedFor[0].split(",")[0].trim();
    }

    const socket = request.socket as { remoteAddress?: string } | undefined;

    return String(request.ip ?? socket?.remoteAddress ?? "unknown");
  }
}
