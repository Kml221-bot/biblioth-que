import { Injectable, OnModuleInit } from "@nestjs/common";
import { Registry, collectDefaultMetrics, Counter, Gauge, Histogram } from "prom-client";

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  readonly httpRequestsTotal = new Counter({
    name: "bibliotech_http_requests_total",
    help: "Nombre total de requetes HTTP recues",
    labelNames: ["method", "route", "status_code"],
    registers: [this.registry],
  });

  readonly httpRequestDuration = new Histogram({
    name: "bibliotech_http_request_duration_seconds",
    help: "Duree des requetes HTTP en secondes",
    labelNames: ["method", "route"],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [this.registry],
  });

  readonly activeUsersGauge = new Gauge({
    name: "bibliotech_active_users",
    help: "Utilisateurs authentifies dans les dernieres 24h",
    registers: [this.registry],
  });

  readonly chaptersUnlockedTotal = new Counter({
    name: "bibliotech_chapters_unlocked_total",
    help: "Chapitres debloque avec BiblioCoins",
    registers: [this.registry],
  });

  readonly coinsSpentTotal = new Counter({
    name: "bibliotech_coins_spent_total",
    help: "BiblioCoins depenses au total",
    registers: [this.registry],
  });

  readonly coinsPurchasedTotal = new Counter({
    name: "bibliotech_coins_purchased_total",
    help: "BiblioCoins achetes au total",
    registers: [this.registry],
  });

  readonly booksViewedTotal = new Counter({
    name: "bibliotech_books_viewed_total",
    help: "Consultations de fiches livres",
    registers: [this.registry],
  });

  readonly searchQueriesTotal = new Counter({
    name: "bibliotech_search_queries_total",
    help: "Recherches effectuees dans le catalogue",
    registers: [this.registry],
  });

  readonly weatherApiCallsTotal = new Counter({
    name: "bibliotech_weather_api_calls_total",
    help: "Appels API OpenWeather",
    labelNames: ["cached"],
    registers: [this.registry],
  });

  readonly openLibraryCallsTotal = new Counter({
    name: "bibliotech_open_library_calls_total",
    help: "Appels API Open Library",
    registers: [this.registry],
  });

  readonly authEventsTotal = new Counter({
    name: "bibliotech_auth_events_total",
    help: "Evenements d'authentification",
    labelNames: ["event"],
    registers: [this.registry],
  });

  onModuleInit() {
    collectDefaultMetrics({ register: this.registry, prefix: "bibliotech_node_" });
  }

  async getMetrics(): Promise<string> { return this.registry.metrics(); }
  contentType(): string { return this.registry.contentType; }
}
