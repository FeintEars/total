import { Module } from '@nestjs/common';
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
        return new Bot(token);
      },
    },
    TelegramPollingService,
    TelegramWebhookGuard,
  ],
  exports: [Bot],
})
export class TelegramModule {}
