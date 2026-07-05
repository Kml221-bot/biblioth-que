import { UserRole, UserStatus } from "@prisma/client";

export type JwtPayload = {
  sub: string;
  email?: string;
  role?: string;
  exp?: number;
  iat?: number;
};

export type AuthenticatedRequestUser = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  nom: string;
  prenom?: string | null;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedRequestUser;
  body?: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
};
