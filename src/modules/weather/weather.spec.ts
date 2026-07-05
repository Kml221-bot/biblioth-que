import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { WeatherService } from "./weather.service";

const MOCK_OW_RESPONSE = {
  name: "Dakar",
  sys: { country: "SN", sunrise: 1_705_302_000, sunset: 1_705_344_000 },
  main: { temp: 29.5, feels_like: 32.1, humidity: 75 },
  wind: { speed: 3.2 },
  weather: [{ description: "ciel dégagé", icon: "01d" }],
};

describe("WeatherService", () => {
  let service: WeatherService;
  const mockCache = { get: jest.fn(), set: jest.fn() };
  const mockConfig = { get: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WeatherService,
        { provide: CACHE_MANAGER, useValue: mockCache },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(WeatherService);
    jest.clearAllMocks();
  });

  it("retourne null si la clé API est absente", async () => {
    mockCache.get.mockResolvedValue(null);
    mockConfig.get.mockReturnValue(undefined);

    const result = await service.getDakarWeather();
    expect(result).toBeNull();
  });

  it("retourne les données du cache Redis avec cached=true", async () => {
    const cached = {
      city: "Dakar",
      country: "SN",
      temperature: 29.5,
      feelsLike: 32.1,
      humidity: 75,
      windSpeed: 3.2,
      condition: { description: "ciel dégagé", icon: "01d", iconUrl: "..." },
      sunrise: "2024-01-15T06:00:00.000Z",
      sunset: "2024-01-15T18:00:00.000Z",
      timestamp: "2024-01-15T10:00:00.000Z",
    };
    mockCache.get.mockResolvedValue(cached);

    const result = await service.getDakarWeather();
    expect(result).toMatchObject({ city: "Dakar", cached: true });
    expect(mockConfig.get).not.toHaveBeenCalled();
  });

  it("appelle l'API OpenWeather et met en cache le résultat", async () => {
    mockCache.get.mockResolvedValue(null);
    mockConfig.get.mockReturnValue("test-api-key");
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_OW_RESPONSE),
    }) as jest.Mock;

    const result = await service.getDakarWeather();

    expect(result).not.toBeNull();
    expect(result?.city).toBe("Dakar");
    expect(result?.country).toBe("SN");
    expect(result?.temperature).toBe(29.5);
    expect(result?.humidity).toBe(75);
    expect(result?.condition.description).toBe("ciel dégagé");
    expect(result?.cached).toBe(false);
    expect(mockCache.set).toHaveBeenCalled();
  });

  it("retourne null si l'API répond avec une erreur HTTP", async () => {
    mockCache.get.mockResolvedValue(null);
    mockConfig.get.mockReturnValue("test-api-key");
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }) as jest.Mock;

    const result = await service.getDakarWeather();
    expect(result).toBeNull();
  });

  it("retourne null si le réseau est hors ligne", async () => {
    mockCache.get.mockResolvedValue(null);
    mockConfig.get.mockReturnValue("test-api-key");
    global.fetch = jest.fn().mockRejectedValue(new Error("network error")) as jest.Mock;

    const result = await service.getDakarWeather();
    expect(result).toBeNull();
  });
});
