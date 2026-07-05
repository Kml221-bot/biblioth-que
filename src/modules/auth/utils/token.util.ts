import { Request } from "express";

export function extractBearerToken(
  request: Pick<Request, "headers">
): string | undefined {
  const authorization = request.headers.authorization;

  if (!authorization) {
    return undefined;
  }

  const value = Array.isArray(authorization) ? authorization[0] : authorization;
  const [scheme, token] = value.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return undefined;
  }

  return token;
}

export function extractRefreshToken(request: {
  body?: Record<string, unknown>;
  headers: Request["headers"];
}) {
  const bodyRefreshToken = request.body?.refreshToken;

  if (typeof bodyRefreshToken === "string") {
    return bodyRefreshToken;
  }

  return extractBearerToken(request);
}
