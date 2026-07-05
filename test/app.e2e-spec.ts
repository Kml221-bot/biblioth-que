import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { GlobalExceptionFilter } from "../src/common/filters/global-exception.filter";

/**
 * BiblioTech — Tests E2E
 *
 * Ces tests vérifient les flows complets de l'API :
 * - Health checks
 * - Authentification (register → login)
 * - Catalogue de livres
 * - Gestion des notifications
 *
 * Prérequis :
 *   - PostgreSQL et Redis démarrés (docker compose up -d)
 *   - DATABASE_URL configuré dans .env ou .env.test
 *   - npx prisma migrate dev
 *
 * Lancer : npx jest --config jest-e2e.config.ts
 */
describe("BiblioTech API (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  // ─── Health Checks ───────────────────────────────────────

  describe("GET /api/health", () => {
    it("devrait retourner 200 avec status ok", () => {
      return request(app.getHttpServer())
        .get("/api/health")
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe("ok");
          expect(res.body.service).toBe("bibliotech-api");
          expect(res.body.timestamp).toBeDefined();
        });
    });
  });

  describe("GET /api/health/ready", () => {
    it("devrait retourner 200 si DB et Redis sont connectes", () => {
      return request(app.getHttpServer())
        .get("/api/health/ready")
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe("ok");
          expect(res.body.details.postgres.status).toBe("up");
          expect(res.body.details.redis.status).toBe("up");
        });
    });
  });

  // ─── Auth — Validation ────────────────────────────────────

  describe("POST /api/auth/register", () => {
    it("devrait rejeter un body vide avec 422", () => {
      return request(app.getHttpServer())
        .post("/api/auth/register")
        .send({})
        .expect(422);
    });

    it("devrait rejeter un email invalide", () => {
      return request(app.getHttpServer())
        .post("/api/auth/register")
        .send({
          email: "pas-un-email",
          password: "MotDePasse123!",
          nom: "Test",
        })
        .expect(422);
    });
  });

  describe("POST /api/auth/login", () => {
    it("devrait rejeter un body vide avec 422", () => {
      return request(app.getHttpServer())
        .post("/api/auth/login")
        .send({})
        .expect(422);
    });
  });

  // ─── Books — Catalogue public ─────────────────────────────

  describe("GET /api/books", () => {
    it("devrait retourner 200 avec un tableau pagine", () => {
      return request(app.getHttpServer())
        .get("/api/books")
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.meta).toBeDefined();
          expect(res.body.meta.total).toBeGreaterThanOrEqual(0);
        });
    });

    it("devrait supporter la pagination", () => {
      return request(app.getHttpServer())
        .get("/api/books?page=1&limit=5")
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeLessThanOrEqual(5);
        });
    });
  });

  describe("GET /api/books/categories", () => {
    it("devrait retourner les categories du catalogue", () => {
      return request(app.getHttpServer())
        .get("/api/books/categories")
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe("GET /api/books/featured", () => {
    it("devrait retourner les livres featured", () => {
      return request(app.getHttpServer())
        .get("/api/books/featured")
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  // ─── Routes protegees — sans JWT ──────────────────────────

  describe("Routes protegees sans JWT", () => {
    it("GET /api/borrows devrait retourner 401", () => {
      return request(app.getHttpServer())
        .get("/api/borrows")
        .expect(401);
    });

    it("GET /api/notifications devrait retourner 401", () => {
      return request(app.getHttpServer())
        .get("/api/notifications")
        .expect(401);
    });

    it("GET /api/badges devrait retourner 401", () => {
      return request(app.getHttpServer())
        .get("/api/badges")
        .expect(401);
    });

    it("GET /api/admin/stats/overview devrait retourner 401", () => {
      return request(app.getHttpServer())
        .get("/api/admin/stats/overview")
        .expect(401);
    });
  });

  // ─── Swagger ──────────────────────────────────────────────

  describe("GET /api/docs", () => {
    it("devrait servir la documentation Swagger", () => {
      return request(app.getHttpServer())
        .get("/api/docs-json")
        .expect(200)
        .expect((res) => {
          expect(res.body.info.title).toBe("BiblioTech API");
          expect(res.body.info.version).toBe("1.0.0");
          expect(res.body.paths).toBeDefined();
        });
    });
  });
});
