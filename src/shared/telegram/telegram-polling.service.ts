import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Bot } from 'grammy';
import telegramConfig from './telegram.config.js';

@Injectable()
export class TelegramPollingService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(TelegramPollingService.name);

  constructor(
    private readonly bot: Bot,
    @Inject(telegramConfig.KEY)
    private readonly config: ConfigType<typeof telegramConfig>,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.polling) {
      return;
    }
    this.bot
      .start({
        onStart: (me) => this.logger.log(`Polling as @${me.username}`),
      })
      .catch((error: unknown) =>
        this.logger.error(
          'Polling stopped',
          error instanceof Error ? error.stack : error,
        ),
      );
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.bot.isRunning()) {
      await this.bot.stop();
    }
  }
}
