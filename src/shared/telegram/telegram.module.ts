import { Logger, Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import { Bot } from 'grammy';
import { TelegramPollingService } from './telegram-polling.service.js';
import { TelegramWebhookController } from './telegram-webhook.controller.js';
import { TelegramWebhookGuard } from './telegram-webhook.guard.js';
import telegramConfig from './telegram.config.js';

@Module({
  imports: [ConfigModule.forFeature(telegramConfig)],
  controllers: [TelegramWebhookController],
  providers: [
    {
      provide: Bot,
      inject: [telegramConfig.KEY],
      useFactory: ({ token }: ConfigType<typeof telegramConfig>) => {
        if (!token) {
          throw new Error('TELEGRAM_BOT_TOKEN is not set');
        }
        const bot = new Bot(token);
        const logger = new Logger('TelegramBot');
        bot.catch(({ error, ctx }) =>
          logger.error(
            `Failed to handle update ${ctx.update.update_id}`,
            error instanceof Error ? error.stack : error,
          ),
        );
        return bot;
      },
    },
    TelegramPollingService,
    TelegramWebhookGuard,
  ],
  exports: [Bot],
})
export class TelegramModule {}
