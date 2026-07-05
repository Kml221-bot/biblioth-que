import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser, Public } from "../../common/decorators";
import { JwtAuthGuard } from "../../common/guards";
import { ResponseDto } from "../../common/dto/response.dto";
import { AuthService } from "./auth.service";
import {
  AuthTokensResponseDto,
  ForgotPasswordDto,
  GoogleCallbackDto,
  LoginDto,
  MfaEnrollmentResponseDto,
  MfaVerifyDto,
  RefreshTokenDto,
  RegisterDto,
  UpdateProfileDto,
  UserProfileResponseDto,
} from "./dto";
import { AuthenticatedRequestUser } from "./types/auth.types";

@Controller("auth")
@ApiTags("Authentication")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  @ApiOperation({ summary: "Creer un compte BiblioTech" })
  @ApiResponse({
    status: 201,
    description: "Compte cree",
    type: AuthTokensResponseDto,
  })
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto) {
    return ResponseDto.created(
      await this.authService.register(dto),
      "Compte cree avec succes"
    );
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("login")
  @ApiOperation({ summary: "Connecter un utilisateur" })
  @ApiResponse({
    status: 200,
    description: "Connexion reussie",
    type: AuthTokensResponseDto,
  })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: LoginDto) {
    return ResponseDto.ok(
      await this.authService.login(dto),
      "Connexion reussie"
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @HttpCode(HttpStatus.OK)
  @Post("logout")
  @ApiOperation({ summary: "Deconnecter la session courante" })
  @ApiResponse({ status: 200, description: "Session invalidee" })
  async logout(@Headers("authorization") authorization?: string) {
    return ResponseDto.ok(
      await this.authService.logout(this.requireBearerToken(authorization))
    );
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("refresh")
  @ApiOperation({ summary: "Generer de nouveaux tokens JWT" })
  @ApiResponse({
    status: 200,
    description: "Tokens renouveles",
    type: AuthTokensResponseDto,
  })
  async refresh(@Body() dto: RefreshTokenDto) {
    return ResponseDto.ok(
      await this.authService.refreshTokens(dto.refreshToken),
      "Tokens renouveles"
    );
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("forgot-password")
  @ApiOperation({
    summary: "Demander un email de reinitialisation de mot de passe",
  })
  @ApiResponse({ status: 200, description: "Reponse anti-enumeration" })
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return ResponseDto.ok(await this.authService.forgotPassword(dto.email));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @Get("me")
  @ApiOperation({ summary: "Recuperer le profil complet connecte" })
  @ApiResponse({
    status: 200,
    description: "Profil utilisateur",
    type: UserProfileResponseDto,
  })
  async me(@CurrentUser() user: AuthenticatedRequestUser) {
    return ResponseDto.ok(await this.authService.getMe(user.id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @Patch("profile")
  @ApiOperation({ summary: "Mettre a jour le profil connecte" })
  @ApiResponse({
    status: 200,
    description: "Profil mis a jour",
    type: UserProfileResponseDto,
  })
  async updateProfile(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: UpdateProfileDto
  ) {
    return ResponseDto.ok(
      await this.authService.updateProfile(user.id, dto),
      "Profil mis a jour"
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @HttpCode(HttpStatus.OK)
  @Post("mfa/enable")
  @ApiOperation({ summary: "Demarrer l’activation MFA TOTP" })
  @ApiResponse({
    status: 200,
    description: "QR code MFA genere",
    type: MfaEnrollmentResponseDto,
  })
  async enableMfa(@Headers("authorization") authorization?: string) {
    return ResponseDto.ok(
      await this.authService.enableMfa(this.requireBearerToken(authorization))
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @HttpCode(HttpStatus.OK)
  @Post("mfa/verify")
  @ApiOperation({ summary: "Verifier le code TOTP et activer la MFA" })
  @ApiResponse({ status: 200, description: "MFA activee" })
  async verifyMfa(
    @Headers("authorization") authorization: string | undefined,
    @Body() dto: MfaVerifyDto
  ) {
    return ResponseDto.ok(
      await this.authService.verifyMfa(
        this.requireBearerToken(authorization),
        dto
      )
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete("account")
  @ApiOperation({ summary: "Supprimer et anonymiser le compte connecte" })
  @ApiResponse({
    status: 204,
    description: "Compte anonymise puis supprime cote Auth",
  })
  async deleteAccount(@CurrentUser() user: AuthenticatedRequestUser) {
    await this.authService.deleteAccount(user.id);
  }

  @Public()
  @Post("google-callback")
  @ApiOperation({ summary: "Creer ou recuperer un profil apres OAuth Google" })
  @ApiResponse({
    status: 201,
    description: "Profil OAuth pret",
    type: UserProfileResponseDto,
  })
  async googleCallback(@Body() dto: GoogleCallbackDto) {
    return ResponseDto.created(
      await this.authService.handleGoogleCallback(dto),
      "Profil OAuth pret"
    );
  }

  private requireBearerToken(authorization?: string) {
    const [scheme, token] = authorization?.split(" ") ?? [];

    if (scheme?.toLowerCase() !== "bearer" || !token) {
      throw new UnauthorizedException("Token Bearer requis");
    }

    return token;
  }
}
