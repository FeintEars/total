import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Bot } from 'grammy';
import type { Update } from 'grammy/types';
import { TelegramWebhookGuard } from './telegram-webhook.guard.js';

@Controller('telegram')
export class TelegramWebhookController {
  private readonly logger = new Logger(TelegramWebhookController.name);

  constructor(private readonly bot: Bot) {}

  @Post('webhook')
  @HttpCode(200)
  @UseGuards(TelegramWebhookGuard)
  async handleUpdate(@Body() update: Update): Promise<void> {
    await this.bot.init();
    try {
      await this.bot.handleUpdate(update);
    } catch (error) {
      this.logger.error(
        `Failed to handle update ${update.update_id}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
