import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class WeatherConditionDto {
  @ApiProperty({ type: String, example: "ciel dégagé" })
  description!: string;

  @ApiProperty({ type: String, example: "01d" })
  icon!: string;

  @ApiProperty({ type: String, example: "https://openweathermap.org/img/wn/01d@2x.png" })
  iconUrl!: string;
}

export class WeatherResponseDto {
  @ApiProperty({ type: String, example: "Dakar" })
  city!: string;

  @ApiProperty({ type: String, example: "SN" })
  country!: string;

  @ApiProperty({ type: Number, example: 29.5, description: "Température en °C" })
  temperature!: number;

  @ApiProperty({ type: Number, example: 32.1, description: "Température ressentie en °C" })
  feelsLike!: number;

  @ApiProperty({ type: Number, example: 75, description: "Humidité en %" })
  humidity!: number;

  @ApiProperty({ type: Number, example: 3.2, description: "Vitesse du vent en m/s" })
  windSpeed!: number;

  @ApiProperty({ type: () => WeatherConditionDto })
  condition!: WeatherConditionDto;

  @ApiProperty({ type: String, example: "2024-01-15T06:15:00.000Z" })
  sunrise!: string;

  @ApiProperty({ type: String, example: "2024-01-15T18:30:00.000Z" })
  sunset!: string;

  @ApiProperty({ type: String, example: "2024-01-15T10:00:00.000Z" })
  timestamp!: string;

  @ApiProperty({ type: Boolean, example: false, description: "Indique si la réponse provient du cache Redis" })
  cached!: boolean;
}
