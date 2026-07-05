import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WeatherResponseDto } from "./dto/weather-response.dto";

const CACHE_KEY = "weather:dakar";
const CACHE_TTL_MS = 10 * 60 * 1_000; // 10 minutes

// Coordonnées de Dakar
const DAKAR = { lat: 14.7167, lon: -17.4677 };

interface OpenWeatherResponse {
  name: string;
  sys: { country: string; sunrise: number; sunset: number };
  main: { temp: number; feels_like: number; humidity: number };
  wind: { speed: number };
  weather: Array<{ description: string; icon: string }>;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @Inject(ConfigService) private readonly config: ConfigService
  ) {}

  async getDakarWeather(): Promise<WeatherResponseDto | null> {
    // Retourner depuis le cache Redis si disponible
    const cached = await this.cache.get<Omit<WeatherResponseDto, "cached">>(CACHE_KEY);
    if (cached) {
      return { ...cached, cached: true };
    }

    const apiKey = this.config.get<string>("weather.apiKey");
    if (!apiKey) {
      this.logger.warn("OPENWEATHER_API_KEY non configuré — météo indisponible");
      return null;
    }

    const url =
      `https://api.openweathermap.org/data/2.5/weather` +
      `?lat=${DAKAR.lat}&lon=${DAKAR.lon}` +
      `&appid=${apiKey}&units=metric&lang=fr`;

    let raw: OpenWeatherResponse;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        this.logger.error(`OpenWeather API erreur HTTP ${res.status}`);
        return null;
      }
      raw = (await res.json()) as OpenWeatherResponse;
    } catch (err) {
      this.logger.error("Erreur réseau OpenWeather", err);
      return null;
    }

    const weather = raw.weather[0];
    const result: Omit<WeatherResponseDto, "cached"> = {
      city: raw.name,
      country: raw.sys.country,
      temperature: Math.round(raw.main.temp * 10) / 10,
      feelsLike: Math.round(raw.main.feels_like * 10) / 10,
      humidity: raw.main.humidity,
      windSpeed: Math.round(raw.wind.speed * 10) / 10,
      condition: {
        description: weather.description,
        icon: weather.icon,
        iconUrl: `https://openweathermap.org/img/wn/${weather.icon}@2x.png`,
      },
      sunrise: new Date(raw.sys.sunrise * 1_000).toISOString(),
      sunset: new Date(raw.sys.sunset * 1_000).toISOString(),
      timestamp: new Date().toISOString(),
    };

    await this.cache.set(CACHE_KEY, result, CACHE_TTL_MS);
    return { ...result, cached: false };
  }
}
