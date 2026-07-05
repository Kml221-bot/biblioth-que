import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { verifyNaboopayWebhookSignature } from "./paymentsService.js";

describe("paymentsService", () => {
  it("verifie une signature HMAC-SHA256 Naboopay valide", () => {
    const rawBody = JSON.stringify({ transaction_id: "tx_123", status: "ACCEPTED" });
    const secret = "secret-test";
    const signature = createHmac("sha256", secret).update(rawBody).digest("hex");

    expect(verifyNaboopayWebhookSignature({ rawBody, signature, secret })).toBe(true);
    expect(verifyNaboopayWebhookSignature({ rawBody, signature: `sha256=${signature}`, secret })).toBe(true);
  });

  it("rejette une signature webhook invalide", () => {
    const rawBody = JSON.stringify({ transaction_id: "tx_123", status: "ACCEPTED" });
    expect(verifyNaboopayWebhookSignature({
      rawBody,
      signature: "00",
      secret: "secret-test",
    })).toBe(false);
  });
});
