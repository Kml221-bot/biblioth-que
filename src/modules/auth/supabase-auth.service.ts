import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseAuthService {
  private readonly adminClient: SupabaseClient;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {
    this.adminClient = createClient(
      this.configService.getOrThrow<string>("supabase.url"),
      this.configService.getOrThrow<string>("supabase.serviceRoleKey"),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  get admin() {
    return this.adminClient;
  }

  clientWithAccessToken(accessToken: string) {
    return createClient(
      this.configService.getOrThrow<string>("supabase.url"),
      this.configService.getOrThrow<string>("supabase.anonKey"),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );
  }
}
