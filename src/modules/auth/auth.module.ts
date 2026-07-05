import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, JwtSignOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import {
  JwtAuthGuard,
  RolesGuard,
  ThrottlerBehindProxyGuard,
} from "../../common/guards";
import { AuthController } from "./auth.controller";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { JwtRefreshStrategy } from "./strategies/jwt-refresh.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { SupabaseAuthService } from "./supabase-auth.service";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("jwt.secret"),
        signOptions: {
          expiresIn: configService.get<string>(
            "jwt.expiresIn",
            "15m"
          ) as JwtSignOptions["expiresIn"],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    SupabaseAuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    JwtAuthGuard,
    RolesGuard,
    ThrottlerBehindProxyGuard,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, ThrottlerBehindProxyGuard],
})
export class AuthModule {}
