import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import webPush, { PushSubscription } from "web-push";

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly enabled: boolean;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    try {
      webPush.setVapidDetails(
        this.configService.get<string>(
          "VAPID_SUBJECT",
          "mailto:notifications@bibliotech.sn"
        ),
        this.configService.getOrThrow<string>("VAPID_PUBLIC_KEY"),
        this.configService.getOrThrow<string>("VAPID_PRIVATE_KEY")
      );
      this.enabled = true;
    } catch (error) {
      this.enabled = false;
      this.logger.warn(
        "Push Web desactive: configure VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY avec de vraies cles avant la production"
      );
    }
  }

  async send(
    userId: string,
    title: string,
    body: string,
    url?: string,
    subscription?: PushSubscription
  ) {
    if (!this.enabled) {
      this.logger.warn(`Push ignore userId=${userId}: VAPID non configure`);

      return { title, message: body };
    }

    if (!subscription) {
      this.logger.warn(
        `Push ignore userId=${userId}: aucune subscription Web Push`
      );

      return { title, message: body };
    }

    await webPush.sendNotification(
      subscription,
      JSON.stringify({
        title,
        body,
        url,
      })
    );

    this.logger.log(`Push envoye userId=${userId}`);

    return { title, message: body };
  }
}
