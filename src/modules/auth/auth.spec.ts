import { ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import {
  SubscriptionPlan,
  SubscriptionStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { SupabaseAuthService } from "./supabase-auth.service";

describe("AuthService", () => {
  const profile = {
    id: "2f4c18f8-4e18-47e1-8e5e-9577b1d631f1",
    email: "aminata@example.com",
    nom: "Diop",
    prenom: "Aminata",
    whatsappNumber: "+221771234567",
    avatarUrl: null,
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    referralCode: "ABC12345",
    lastLoginAt: null,
    anonymizedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    subscriptions: [
      {
        id: "a7b0130f-4b1b-4b2d-9bf6-07f5278798a1",
        userId: "2f4c18f8-4e18-47e1-8e5e-9577b1d631f1",
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
        empruntsRestants: 3,
        autoRenew: false,
        startsAt: new Date(),
        endsAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    stats: {
      id: "1ca7d9a7-0614-4abc-8366-5b8fed1c643e",
      userId: "2f4c18f8-4e18-47e1-8e5e-9577b1d631f1",
      livresLus: 0,
      pagesLues: 0,
      minutesLecture: 0,
      streakJours: 0,
      categoriesFavorites: [],
      lastReadAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const authRepository = {
    findUserByEmail: jest.fn(),
    createUserProfile: jest.fn(),
  };

  const supabaseAuthService = {
    admin: {
      auth: {
        admin: {
          createUser: jest.fn(),
        },
        signInWithPassword: jest.fn(),
      },
    },
  };

  const configService = {
    get: jest.fn(),
  };

  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: authRepository },
        { provide: SupabaseAuthService, useValue: supabaseAuthService },
        { provide: ConfigService, useValue: configService },
      ],
    })
      .overrideProvider(ConfigService)
      .useValue(configService)
      .compile();

    service = moduleRef.get(AuthService);
  });

  it("cree le compte Supabase, le profil, la souscription free et les stats", async () => {
    authRepository.findUserByEmail.mockResolvedValue(null);
    authRepository.createUserProfile.mockResolvedValue(profile);
    supabaseAuthService.admin.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: profile.id } },
      error: null,
    });
    supabaseAuthService.admin.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600,
          user: { id: profile.id },
        },
      },
      error: null,
    });

    const result = await service.register({
      email: profile.email,
      password: "BiblioTech2026!",
      nom: profile.nom,
      prenom: profile.prenom,
      whatsappNumber: profile.whatsappNumber,
    });

    expect(
      supabaseAuthService.admin.auth.admin.createUser
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        email: profile.email,
        password: "BiblioTech2026!",
        email_confirm: true,
      })
    );
    expect(authRepository.createUserProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        id: profile.id,
        email: profile.email,
        nom: profile.nom,
      })
    );
    expect(result.user.subscription?.plan).toBe(SubscriptionPlan.FREE);
    expect(result.user.stats?.livresLus).toBe(0);
  });

  it("refuse un email deja utilise", async () => {
    authRepository.findUserByEmail.mockResolvedValue(profile);

    await expect(
      service.register({
        email: profile.email,
        password: "BiblioTech2026!",
        nom: profile.nom,
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
