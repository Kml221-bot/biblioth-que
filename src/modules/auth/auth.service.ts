import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthError } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import {
  AuthTokensResponseDto,
  GoogleCallbackDto,
  LoginDto,
  MfaEnrollmentResponseDto,
  MfaVerifyDto,
  RegisterDto,
  UpdateProfileDto,
  UserProfileResponseDto,
} from "./dto";
import { AuthRepository, UserProfileWithRelations } from "./auth.repository";
import { SupabaseAuthService } from "./supabase-auth.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(AuthRepository)
    private readonly authRepository: AuthRepository,
    @Inject(SupabaseAuthService)
    private readonly supabaseAuthService: SupabaseAuthService,
    @Inject(ConfigService)
    private readonly configService: ConfigService
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensResponseDto> {
    const existingUser = await this.authRepository.findUserByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException("Un compte existe deja avec cet email");
    }

    const { data, error } =
      await this.supabaseAuthService.admin.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
        user_metadata: {
          nom: dto.nom,
          prenom: dto.prenom,
          whatsappNumber: dto.whatsappNumber,
        },
      });

    if (error || !data.user) {
      throw this.mapSupabaseAuthError(error, "Creation du compte impossible");
    }

    const profile = await this.authRepository.createUserProfile({
      id: data.user.id,
      email: dto.email,
      nom: dto.nom,
      prenom: dto.prenom,
      whatsappNumber: dto.whatsappNumber,
      referralCode: this.generateReferralCode(),
      referredByCode: dto.referralCode,
    });

    const session = await this.signInWithPassword(dto.email, dto.password);

    return this.toAuthTokensResponse(session, profile);
  }

  async login(dto: LoginDto): Promise<AuthTokensResponseDto> {
    const session = await this.signInWithPassword(dto.email, dto.password);
    const userId = session.user?.id;

    if (!userId) {
      throw new UnauthorizedException("Identifiants invalides");
    }

    const profile = await this.authRepository.findUserById(userId);

    if (!profile) {
      throw new UnauthorizedException("Profil utilisateur introuvable");
    }

    return this.toAuthTokensResponse(session, profile);
  }

  async logout(accessToken: string) {
    const { error } =
      await this.supabaseAuthService.admin.auth.admin.signOut(accessToken);

    if (error) {
      throw this.mapSupabaseAuthError(error, "Deconnexion impossible");
    }

    return { loggedOut: true };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokensResponseDto> {
    const { data, error } =
      await this.supabaseAuthService.admin.auth.refreshSession({
        refresh_token: refreshToken,
      });

    if (error || !data.session) {
      throw new UnauthorizedException("Refresh token invalide ou expire");
    }

    const profile = await this.authRepository.findUserById(
      data.session.user.id
    );

    if (!profile) {
      throw new UnauthorizedException("Profil utilisateur introuvable");
    }

    return this.toAuthTokensResponse(data.session, profile);
  }

  async forgotPassword(email: string) {
    const frontendUrl = this.configService.get<string>("app.frontendUrl");

    const { error } =
      await this.supabaseAuthService.admin.auth.resetPasswordForEmail(email, {
        redirectTo: `${frontendUrl}/auth/reset-password`,
      });

    if (error) {
      // Anti-enumeration : on loggue sans reveler au client si l'email existe.
      this.logger.warn(
        `Echec reset password pour email=${email}: ${error.message}`
      );
    }

    return {
      message:
        "Si ce compte existe, un email de reinitialisation a ete envoye.",
    };
  }

  async getMe(userId: string): Promise<UserProfileResponseDto> {
    const profile = await this.authRepository.findUserById(userId);

    if (!profile) {
      throw new UnauthorizedException("Profil utilisateur introuvable");
    }

    return this.toUserProfileResponse(profile);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto
  ): Promise<UserProfileResponseDto> {
    const profile = await this.authRepository.updateUser(userId, {
      nom: dto.nom,
      prenom: dto.prenom,
      whatsappNumber: dto.whatsappNumber,
      avatarUrl: dto.avatarUrl,
    });

    return this.toUserProfileResponse(profile);
  }

  async enableMfa(accessToken: string): Promise<MfaEnrollmentResponseDto> {
    const client = this.supabaseAuthService.clientWithAccessToken(accessToken);
    const { data, error } = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "BiblioTech",
    });

    if (error || !data) {
      throw this.mapSupabaseAuthError(error, "Activation MFA impossible");
    }

    const totp = data.totp as { qr_code?: string; uri?: string } | undefined;
    const qrSource = totp?.qr_code ?? totp?.uri;

    if (!qrSource) {
      throw new BadRequestException("QR code MFA indisponible");
    }

    return {
      factorId: data.id,
      qrCode: qrSource.startsWith("data:image")
        ? qrSource
        : await QRCode.toDataURL(qrSource),
    };
  }

  async verifyMfa(accessToken: string, dto: MfaVerifyDto) {
    const client = this.supabaseAuthService.clientWithAccessToken(accessToken);
    const challenge = await client.auth.mfa.challenge({
      factorId: dto.factorId,
    });

    if (challenge.error || !challenge.data) {
      throw this.mapSupabaseAuthError(
        challenge.error,
        "Challenge MFA impossible"
      );
    }

    const { data, error } = await client.auth.mfa.verify({
      factorId: dto.factorId,
      challengeId: challenge.data.id,
      code: dto.code,
    });

    if (error || !data) {
      throw this.mapSupabaseAuthError(error, "Code MFA invalide");
    }

    return { enabled: true };
  }

  async deleteAccount(userId: string) {
    const pendingPenalties =
      await this.authRepository.countPendingPenalties(userId);

    if (pendingPenalties > 0) {
      throw new ForbiddenException(
        "Impossible de supprimer le compte avec des amendes en attente"
      );
    }

    await this.authRepository.deleteUser(userId);
    const { error } =
      await this.supabaseAuthService.admin.auth.admin.deleteUser(userId);

    if (error) {
      this.logger.warn(
        `Profil anonymise, suppression Supabase echouee userId=${userId}: ${error.message}`
      );
    }
  }

  async handleGoogleCallback(
    dto: GoogleCallbackDto
  ): Promise<UserProfileResponseDto> {
    const { data, error } = await this.supabaseAuthService.admin.auth.getUser(
      dto.accessToken
    );

    if (error || !data.user?.email) {
      throw new UnauthorizedException("Callback Google invalide");
    }

    const existingProfile = await this.authRepository.findUserById(
      data.user.id
    );

    if (existingProfile) {
      return this.toUserProfileResponse(existingProfile);
    }

    const metadata = data.user.user_metadata;
    const profile = await this.authRepository.createUserProfile({
      id: data.user.id,
      email: data.user.email,
      nom: this.safeMetadataString(
        metadata.name ?? metadata.full_name ?? metadata.last_name,
        "Utilisateur"
      ),
      prenom: this.safeMetadataString(
        metadata.given_name ?? metadata.first_name
      ),
      referralCode: this.generateReferralCode(),
    });

    return this.toUserProfileResponse(profile);
  }

  async validateAccessToken(accessToken: string) {
    const { data, error } =
      await this.supabaseAuthService.admin.auth.getUser(accessToken);

    if (error || !data.user) {
      throw new UnauthorizedException("Token invalide ou expire");
    }

    const profile = await this.authRepository.findUserById(data.user.id);

    if (!profile) {
      throw new UnauthorizedException("Profil utilisateur introuvable");
    }

    return this.toUserProfileResponse(profile);
  }

  async validateRefreshToken(refreshToken: string) {
    const refreshed = await this.refreshTokens(refreshToken);
    return refreshed.user;
  }

  private async signInWithPassword(email: string, password: string) {
    const { data, error } =
      await this.supabaseAuthService.admin.auth.signInWithPassword({
        email,
        password,
      });

    if (error || !data.session) {
      throw new UnauthorizedException("Identifiants invalides");
    }

    return data.session;
  }

  private toAuthTokensResponse(
    session: {
      access_token: string;
      refresh_token: string;
      expires_in?: number;
    } & { user?: { id?: string } },
    profile: UserProfileWithRelations
  ): AuthTokensResponseDto {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in,
      user: this.toUserProfileResponse(profile),
    };
  }

  private toUserProfileResponse(
    profile: UserProfileWithRelations
  ): UserProfileResponseDto {
    const subscription = profile.subscriptions[0] ?? null;

    return {
      id: profile.id,
      email: profile.email,
      nom: profile.nom,
      prenom: profile.prenom,
      whatsappNumber: profile.whatsappNumber,
      avatarUrl: profile.avatarUrl,
      role: profile.role,
      status: profile.status,
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status as import("@prisma/client").SubscriptionStatus,
            empruntsRestants: subscription.empruntsRestants,
            endsAt: subscription.endsAt,
          }
        : null,
      stats: profile.stats
        ? {
            livresLus: profile.stats.livresLus,
            pagesLues: profile.stats.pagesLues,
            minutesLecture: profile.stats.minutesLecture,
            streakJours: profile.stats.streakJours,
            categoriesFavorites: profile.stats.categoriesFavorites,
          }
        : null,
    };
  }

  private mapSupabaseAuthError(
    error: AuthError | null,
    fallbackMessage: string
  ) {
    if (!error) {
      return new BadRequestException(fallbackMessage);
    }

    if (error.status === 400 || error.status === 422) {
      return new BadRequestException(error.message);
    }

    if (
      error.status === 409 ||
      error.message.toLowerCase().includes("already")
    ) {
      return new ConflictException(error.message);
    }

    if (error.status === 401 || error.status === 403) {
      return new UnauthorizedException(error.message);
    }

    return new BadRequestException(error.message || fallbackMessage);
  }

  private generateReferralCode() {
    return randomBytes(6)
      .toString("base64url")
      .replace(/[^A-Z0-9]/gi, "")
      .slice(0, 8)
      .toUpperCase();
  }

  private safeMetadataString(value: unknown, fallback = "") {
    return typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : fallback;
  }
}
