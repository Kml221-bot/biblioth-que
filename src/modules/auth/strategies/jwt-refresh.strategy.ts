import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthService } from "../auth.service";
import { JwtPayload } from "../types/auth.types";
import { extractRefreshToken } from "../utils/token.util";

const refreshTokenExtractor = (request: {
  body?: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
}) => extractRefreshToken(request) ?? null;

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  "jwt-refresh"
) {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
    @Inject(ConfigService)
    configService: ConfigService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([refreshTokenExtractor]),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: configService.getOrThrow<string>("jwt.secret"),
    });
  }

  async validate(
    request: {
      body?: Record<string, unknown>;
      headers: Record<string, string | string[] | undefined>;
    },
    payload: JwtPayload
  ) {
    const refreshToken = extractRefreshToken(request);

    if (!refreshToken || !payload.sub) {
      throw new UnauthorizedException("Refresh token invalide");
    }

    return this.authService.validateRefreshToken(refreshToken);
  }
}
