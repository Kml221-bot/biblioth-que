// ============================================================
// BiblioTech — WhatsApp Service
// Provider : Meta WhatsApp Cloud API (officiel, gratuit 1000 conv/mois)
// Fallback : Africa's Talking SMS si WhatsApp échoue
// ============================================================

import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import {
  renderWhatsAppTemplate,
  WhatsAppTemplate,
} from "../templates/notification-templates";

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  async send(
    to: string,
    template: WhatsAppTemplate,
    vars: Record<string, string | number | undefined>
  ) {
    const rendered = renderWhatsAppTemplate(template, vars);
    const body = `${rendered.message}\n\n${rendered.wolof}`;

    // ── 1. Essai Meta WhatsApp Cloud API ─────────────────────
    const metaResult = await this.sendViaMetaAPI(to, body);
    if (metaResult.success) {
      this.logger.log(`WhatsApp Meta envoyé to=${to} template=${template}`);
      return rendered;
    }

    // ── 2. Fallback Africa's Talking SMS ─────────────────────
    const smsResult = await this.sendViaSMS(to, body);
    if (smsResult.success) {
      this.logger.log(`SMS AT (fallback WhatsApp) envoyé to=${to} template=${template}`);
      return rendered;
    }

    // ── 3. Log si tout échoue (ne pas planter le job) ────────
    this.logger.warn(
      `Notification échouée (WhatsApp + SMS) to=${to} template=${template}: ` +
      `Meta=${metaResult.error} | AT=${smsResult.error}`
    );
    return rendered;
  }

  // ── Meta WhatsApp Cloud API ─────────────────────────────────
  private async sendViaMetaAPI(to: string, body: string) {
    const phoneId = this.configService.get<string>("META_WHATSAPP_PHONE_ID");
    const accessToken = this.configService.get<string>("META_WHATSAPP_ACCESS_TOKEN");

    if (!phoneId || !accessToken) {
      return { success: false, error: "META_WHATSAPP_PHONE_ID ou ACCESS_TOKEN non configuré" };
    }

    try {
      const cleanNumber = to.replace(/^whatsapp:/, "").replace(/\D/g, "");

      await axios.post(
        `https://graph.facebook.com/v18.0/${phoneId}/messages`,
        {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanNumber,
          type: "text",
          text: { preview_url: false, body },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 15_000,
        }
      );

      return { success: true };
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? `HTTP ${err.response?.status} — ${JSON.stringify(err.response?.data)}`
        : (err as Error).message;
      return { success: false, error: msg };
    }
  }

  // ── Africa's Talking SMS (fallback) ────────────────────────
  private async sendViaSMS(to: string, body: string) {
    const username = this.configService.get<string>("AT_USERNAME");
    const apiKey  = this.configService.get<string>("AT_API_KEY");

    if (!username || !apiKey) {
      return { success: false, error: "AT_USERNAME ou AT_API_KEY non configuré" };
    }

    try {
      const cleanNumber = to.replace(/^whatsapp:/, "");
      const message = body.slice(0, 160); // limite SMS

      await axios.post(
        "https://api.africastalking.com/version1/messaging",
        new URLSearchParams({ username, to: cleanNumber, message }),
        {
          headers: {
            apiKey,
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 15_000,
        }
      );

      return { success: true };
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? `HTTP ${err.response?.status} — ${JSON.stringify(err.response?.data)}`
        : (err as Error).message;
      return { success: false, error: msg };
    }
  }
}
