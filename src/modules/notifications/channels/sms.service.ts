import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  async send(to: string, message: string) {
    const trimmedMessage = message.slice(0, 160);

    await axios.post(
      "https://api.africastalking.com/version1/messaging",
      new URLSearchParams({
        username: this.configService.getOrThrow<string>("AT_USERNAME"),
        to,
        message: trimmedMessage,
      }),
      {
        headers: {
          apiKey: this.configService.getOrThrow<string>("AT_API_KEY"),
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 15_000,
      }
    );

    this.logger.log(`SMS envoye to=${to}`);

    return {
      title: "SMS BiblioTech",
      message: trimmedMessage,
    };
  }
}
