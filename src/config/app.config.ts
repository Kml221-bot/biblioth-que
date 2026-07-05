import { registerAs } from "@nestjs/config";
import Joi from "joi";

export const appConfig = registerAs("app", () => ({
  port: Number(process.env.NEST_PORT ?? process.env.PORT ?? 3002),
  env: process.env.NODE_ENV ?? "development",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
}));

export const supabaseConfig = registerAs("supabase", () => ({
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
}));

export const naboopayConfig = registerAs("naboopay", () => ({
  apiKey: process.env.NABOOPAY_API_KEY,
  secretKey: process.env.NABOOPAY_SECRET_KEY,
  webhookSecret: process.env.NABOOPAY_SECRET_KEY || process.env.NABOOPAY_WEBHOOK_SECRET,
  env: process.env.NABOOPAY_ENV || "sandbox",
}));

// Twilio conservé pour compatibilité ascendante (migrations anciennes)
export const twilioConfig = registerAs("twilio", () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  from: process.env.TWILIO_WHATSAPP_FROM,
}));

// Meta WhatsApp Cloud API — remplace Twilio
export const metaConfig = registerAs("meta", () => ({
  whatsappPhoneId: process.env.META_WHATSAPP_PHONE_ID ?? "",
  whatsappAccessToken: process.env.META_WHATSAPP_ACCESS_TOKEN ?? "",
}));

export const weatherConfig = registerAs("weather", () => ({
  apiKey: process.env.OPENWEATHER_API_KEY ?? "",
  // Coordonnées de Dakar, Sénégal
  dakarLat: 14.7167,
  dakarLon: -17.4677,
}));

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "test", "production")
    .default("development"),
  PORT: Joi.number().port().default(3001),
  FRONTEND_URL: Joi.string().uri().default("http://localhost:3000"),
  CORS_ALLOWED_ORIGINS: Joi.string().optional(),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ["postgresql", "postgres"] })
    .required(),
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_ANON_KEY: Joi.string().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default("30d"),

  REDIS_URL: Joi.string()
    .uri({ scheme: ["redis", "rediss"] })
    .optional(),
  REDIS_HOST: Joi.string().default("localhost"),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow("", null).optional(),
  REDIS_TLS: Joi.boolean().default(false),

  // Naboopay — agrégateur de paiement sénégalais (Wave, Orange Money, etc.)
  NABOOPAY_MERCHANT_ID: Joi.string().allow("", null).optional(),
  NABOOPAY_API_KEY: Joi.string().allow("", null).optional(),
  NABOOPAY_WEBHOOK_SECRET: Joi.string().allow("", null).optional(),
  NABOOPAY_ENV: Joi.string().valid("sandbox", "production").default("sandbox"),

  TWILIO_ACCOUNT_SID: Joi.string().allow("", null).when("NODE_ENV", {
    is: "production",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  TWILIO_AUTH_TOKEN: Joi.string().allow("", null).when("NODE_ENV", {
    is: "production",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  TWILIO_WHATSAPP_FROM: Joi.string().allow("", null).when("NODE_ENV", {
    is: "production",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  AT_USERNAME: Joi.string().allow("", null).when("NODE_ENV", {
    is: "production",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  AT_API_KEY: Joi.string().allow("", null).when("NODE_ENV", {
    is: "production",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  RESEND_API_KEY: Joi.string().allow("", null).when("NODE_ENV", {
    is: "production",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  EMAIL_FROM: Joi.string().allow("", null).when("NODE_ENV", {
    is: "production",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  OPENROUTER_API_KEY: Joi.string().allow("", null).optional(),

  // OpenWeather — optionnel
  OPENWEATHER_API_KEY: Joi.string().allow("", null).optional(),

  // Meta WhatsApp Cloud API — remplace Twilio (gratuit, 1000 conv/mois)
  META_WHATSAPP_PHONE_ID:     Joi.string().allow("", null).optional(),
  META_WHATSAPP_ACCESS_TOKEN: Joi.string().allow("", null).optional(),

  // VAPID — optionnel (push notifications désactivées si absent)
  VAPID_PUBLIC_KEY: Joi.string().allow("", null).optional(),
  VAPID_PRIVATE_KEY: Joi.string().allow("", null).optional(),
});
