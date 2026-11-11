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

  // Runs after every module's onModuleInit, so all handlers are registered:
  // grammY refuses new ones once polling has started.
  onApplicationBootstrap(): void {
    if (!this.config.polling) {
      return;
    }
    // Not awaited: start() only resolves once polling stops.
    // It also deletes the bot's webhook, since Telegram allows one or the other.
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
