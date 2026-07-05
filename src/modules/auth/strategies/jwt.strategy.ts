import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthService } from "../auth.service";
import { JwtPayload } from "../types/auth.types";
import { extractBearerToken } from "../utils/token.util";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
    @Inject(ConfigService)
    configService: ConfigService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: configService.getOrThrow<string>("jwt.secret"),
    });
  }

  async validate(
    request: { headers: Record<string, string | string[] | undefined> },
    payload: JwtPayload
  ) {
    const token = extractBearerToken(request);

    if (!token || !payload.sub) {
      throw new UnauthorizedException("Token JWT invalide");
    }

    return this.authService.validateAccessToken(token);
  }
}
