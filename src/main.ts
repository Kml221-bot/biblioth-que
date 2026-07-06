import {
  Logger,
  UnprocessableEntityException,
  ValidationPipe,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import compression from "compression";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { WinstonLoggerService } from "./common/logger/winston-logger.service";
import { MetricsInterceptor } from "./modules/metrics/metrics.interceptor";
import { MetricsService } from "./modules/metrics/metrics.service";

async function bootstrap() {
  const winstonLogger = new WinstonLoggerService();
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(winstonLogger);

  const configService = app.get(ConfigService);
  const frontendUrl = configService.get<string>(
    "app.frontendUrl",
    "http://localhost:5173"
  );
  const corsAllowedOrigins = configService.get<string>("CORS_ALLOWED_ORIGINS");

  app.setGlobalPrefix("api");
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: corsAllowedOrigins
      ? corsAllowedOrigins.split(",").map(origin => origin.trim())
      : [frontendUrl],
    credentials: true,
    allowedHeaders: ["Authorization", "Content-Type", "X-Request-ID"],
    exposedHeaders: [
      "X-Request-ID",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      errorHttpStatusCode: 422,
      exceptionFactory: errors => new UnprocessableEntityException(errors),
    })
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new MetricsInterceptor(app.get(MetricsService)),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("BiblioTech API")
    .setDescription(
      "API REST de la bibliotheque numerique senegalaise BiblioTech."
    )
    .setVersion("1.0.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "Authorization",
        description: "Token JWT Supabase: Bearer <jwt_token>",
        in: "header",
      },
      "JWT-auth"
    )
    .build();

  const enableSwagger = process.env.ENABLE_SWAGGER !== "false";
  if (enableSwagger) {
    try {
      const document = SwaggerModule.createDocument(app, swaggerConfig);
      SwaggerModule.setup("api/docs", app, document, {
        swaggerOptions: { persistAuthorization: true },
      });
    } catch (err) {
      winstonLogger.warn(
        `Swagger désactivé (erreur de génération) : ${(err as Error).message}`,
        "Bootstrap",
      );
    }
  }

  const port = configService.get<number>("app.port", 3001);
  await app.listen(port, "0.0.0.0");
  winstonLogger.log(`BiblioTech API demarree sur http://localhost:${port}/api`, "Bootstrap");
  winstonLogger.log(
    enableSwagger
      ? `Documentation Swagger disponible sur http://localhost:${port}/api/docs`
      : "Documentation Swagger desactivee",
    "Bootstrap",
  );
}

void bootstrap();
