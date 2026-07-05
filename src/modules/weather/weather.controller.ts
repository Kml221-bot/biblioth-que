import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { ResponseDto } from "../../common/dto/response.dto";
import { WeatherResponseDto } from "./dto/weather-response.dto";
import { WeatherService } from "./weather.service";

@Controller("weather")
@ApiTags("Weather")
export class WeatherController {
  constructor(
    @Inject(WeatherService)
    private readonly weatherService: WeatherService
  ) {}

  @Get("dakar")
  @SkipThrottle()
  @ApiOperation({
    summary: "Météo en temps réel à Dakar, Sénégal",
    description:
      "Données OpenWeather — rafraîchissement toutes les 10 minutes via cache Redis. " +
      "Retourne null si la clé API n'est pas configurée.",
  })
  @ApiResponse({
    status: 200,
    description: "Météo actuelle à Dakar",
    type: WeatherResponseDto,
  })
  async getDakarWeather() {
    return ResponseDto.ok(await this.weatherService.getDakarWeather());
  }
}
