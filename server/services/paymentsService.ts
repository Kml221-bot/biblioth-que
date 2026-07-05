import { createHmac, timingSafeEqual } from "crypto";

export function verifyNaboopayWebhookSignature(input: {
  rawBody: string;
  signature: string;
  secret: string;
}): boolean {
  if (!input.secret || !input.signature) return false;

  const received = input.signature.replace(/^sha256=/i, "");
  const expected = createHmac("sha256", input.secret).update(input.rawBody).digest("hex");
  const receivedBuffer = Buffer.from(received, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}
