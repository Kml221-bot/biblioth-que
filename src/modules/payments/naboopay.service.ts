import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { createHmac, timingSafeEqual } from "node:crypto";
import { WebhookDto } from "./dto";

export type NaboopayParams = {
  transactionId: string;
  amount: number;
  currency: string;
  description: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  methodOfPayment?: string;
};

export interface NaboopayWebhookPayload {
  transaction_id: string;
  merchant_transaction_id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: "SUCCESS" | "FAILED" | "PENDING" | "CANCELLED";
  payment_method: string;
  customer_phone?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Service Naboopay v2 — Agrégateur de paiement sénégalais
 * Supporte : Wave, Orange Money, Free Money, E-money, Visa, Mastercard
 * API Docs : https://docs.naboopay.com
 * Base URL : https://api.naboopay.com/api/v2
 */
@Injectable()
export class NaboopayService {
  private readonly logger = new Logger(NaboopayService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly webhookSecret: string | undefined;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {
    this.baseUrl = this.configService.get<string>(
      "NABOOPAY_API_URL",
      "https://api.naboopay.com"
    );
    this.apiKey = this.configService.get<string>("NABOOPAY_API_KEY") 
      || this.configService.get<string>("naboopay.apiKey");
    this.webhookSecret = this.configService.get<string>("NABOOPAY_SECRET_KEY")
      || this.configService.get<string>("NABOOPAY_WEBHOOK_SECRET")
      || this.configService.get<string>("naboopay.webhookSecret");
  }

  /**
   * Crée une transaction de paiement via Naboopay API v2
   * POST /api/v2/transactions
   * @returns URL de paiement (checkout_url) à présenter au client
   */
  async createPayment(params: NaboopayParams): Promise<{ paymentUrl: string; orderId: string }> {
    if (!this.apiKey) {
      this.logger.error("NABOOPAY_API_KEY non configuré.");
      throw new BadGatewayException(
        "Configuration de paiement Naboopay incomplète côté serveur."
      );
    }

    const notifyUrl = this.configService.get<string>(
      "NABOOPAY_WEBHOOK_URL",
      this.configService.get<string>(
        "NABOOPAY_NOTIFY_URL",
        `${this.configService.get("app.backendUrl") || "http://localhost:3002"}/api/payments/webhook`
      )
    );
    const returnUrl = this.configService.get<string>(
      "NABOOPAY_RETURN_URL",
      `${this.configService.get("app.frontendUrl") || "http://localhost:3000"}/abonnements?payment=success`
    );

    const requestBody = {
      method_of_payment: [params.methodOfPayment || "wave"],
      products: [{
        name: params.description,
        price: params.amount,
        quantity: 1,
      }],
      currency: params.currency || "XOF",
      customer: {
        name: params.customerName || "Client BiblioTech",
        email: params.customerEmail || "client@bibliotech.sn",
        phone: params.customerPhone || "",
      },
      webhook_url: notifyUrl,
      success_url: returnUrl,
      error_url: `${this.configService.get("app.frontendUrl") || "http://localhost:3000"}/abonnements?payment=cancelled`,
    };

    this.logger.log(
      `Création paiement Naboopay v2: ${params.transactionId} — ${params.amount} ${params.currency || "XOF"}`
    );

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v2/transactions`,
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`,
          },
          timeout: 30_000,
        }
      );

      // Naboopay v2 returns checkout_url or payment_url
      const paymentUrl =
        response.data?.checkout_url ??
        response.data?.data?.checkout_url ??
        response.data?.payment_url ??
        response.data?.data?.payment_url;
      const orderId = response.data?.order_id ?? response.data?.data?.order_id;

      if (!paymentUrl) {
        this.logger.error(
          "Réponse Naboopay sans URL de paiement",
          JSON.stringify(response.data)
        );
        throw new BadGatewayException(
          "Naboopay n'a pas retourné d'URL de paiement"
        );
      }

      this.logger.log(
        `Paiement Naboopay créé : ${params.transactionId} → ${paymentUrl}`
      );

      return { paymentUrl, orderId };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;
        this.logger.error(
          `Échec Naboopay v2 [${status}]: ${JSON.stringify(data)}`,
          error.stack
        );
        const errorMsg =
          data?.message ||
          data?.error ||
          data?.detail ||
          error.message;
        throw new BadGatewayException(
          `Paiement Naboopay indisponible : ${errorMsg}`
        );
      }

      this.logger.error(
        "Échec création paiement Naboopay",
        error instanceof Error ? error.stack : undefined
      );
      throw new BadGatewayException(
        "Paiement Naboopay indisponible pour le moment"
      );
    }
  }

  /**
   * Vérifie la signature HMAC du webhook Naboopay
   */
  verifyWebhookSignature(
    body: NaboopayWebhookPayload | WebhookDto,
    signature?: string
  ): boolean {
    if (!signature) {
      this.logger.warn("Webhook Naboopay reçu sans signature");
      // En dev, on accepte sans signature si pas de secret configuré
      if (!this.webhookSecret) {
        this.logger.warn("Pas de NABOOPAY_SECRET_KEY configuré — webhook accepté sans vérification");
        return true;
      }
      return false;
    }

    if (!this.webhookSecret) {
      this.logger.warn("NABOOPAY_SECRET_KEY non configuré — impossible de vérifier");
      return true; // Accept in dev mode without secret
    }

    // Naboopay utilise HMAC-SHA256 sur le JSON stringifié
    const payload = JSON.stringify(body);
    const expectedSignature = createHmac("sha256", this.webhookSecret)
      .update(payload)
      .digest("hex");

    return this.secureCompare(expectedSignature, signature);
  }

  /**
   * Vérifie le statut d'une transaction via l'API Naboopay v2
   * GET /api/v2/transactions/{order_id}
   */
  async checkTransactionStatus(transactionId: string): Promise<{
    status: "SUCCESS" | "FAILED" | "PENDING" | "CANCELLED";
    amount: number;
    currency: string;
    payment_method?: string;
  }> {
    if (!this.apiKey) throw new BadGatewayException("Clé Naboopay manquante");

    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v2/transactions/${transactionId}`,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`,
          },
          timeout: 15_000,
        }
      );

      const data = response.data?.data ?? response.data;
      return {
        status: data.status || "PENDING",
        amount: data.price || data.amount || 0,
        currency: data.currency || "XOF",
        payment_method: data.method_of_payment || data.payment_method,
      };
    } catch (error) {
      this.logger.error(
        `Erreur vérification statut Naboopay ${transactionId}`,
        error instanceof Error ? error.stack : undefined
      );
      throw new BadGatewayException(
        "Impossible de vérifier le statut du paiement"
      );
    }
  }

  /**
   * Initie un payout (retrait) vers un compte mobile money
   * Utilisé pour payer les auteurs
   */
  async initiatePayout(to: string, amount: number, description?: string) {
    if (!this.apiKey) {
      throw new BadGatewayException("Configuration Naboopay incomplète");
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v2/payouts`,
        {
          amount,
          currency: "XOF",
          recipient_phone: to,
          description: description ?? "Paiement BiblioTech",
          method_of_payment: "wave",
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`,
          },
          timeout: 30_000,
        }
      );

      this.logger.log(`Payout Naboopay initié vers ${to} : ${amount} FCFA`);

      return {
        provider: "NABOOPAY",
        status: response.data?.data?.status ?? response.data?.status ?? "PENDING",
        amount,
        payout_id: response.data?.data?.payout_id ?? response.data?.id,
      };
    } catch (error) {
      this.logger.error(
        "Échec payout Naboopay",
        error instanceof Error ? error.stack : undefined
      );

      if (axios.isAxiosError(error)) {
        const errorMsg =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message;
        throw new BadGatewayException(`Payout Naboopay échoué : ${errorMsg}`);
      }

      throw new BadGatewayException("Payout Naboopay indisponible");
    }
  }

  /**
   * Comparaison sécurisée pour éviter les timing attacks
   */
  private secureCompare(expected: string, received: string): boolean {
    const normalizedReceived = received.trim().toLowerCase();
    const normalizedExpected = expected.trim().toLowerCase();

    if (normalizedExpected.length !== normalizedReceived.length) {
      return false;
    }

    try {
      return timingSafeEqual(
        Buffer.from(normalizedExpected),
        Buffer.from(normalizedReceived)
      );
    } catch {
      return false;
    }
  }
}
