import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import {
  EmailTemplate,
  renderEmailTemplate,
} from "../templates/notification-templates";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  async send(
    to: string,
    template: EmailTemplate,
    data: Record<string, string | number | undefined>
  ) {
    const rendered = renderEmailTemplate(template, data);

    await axios.post(
      "https://api.resend.com/emails",
      {
        from: this.configService.getOrThrow<string>("EMAIL_FROM"),
        to,
        subject: rendered.subject,
        html: rendered.html,
      },
      {
        headers: {
          Authorization: `Bearer ${this.configService.getOrThrow<string>("RESEND_API_KEY")}`,
        },
        timeout: 15_000,
      }
    );

    this.logger.log(`Email envoye to=${to} template=${template}`);

    return {
      title: rendered.subject,
      message: String(data.message ?? rendered.subject),
    };
  }
}
