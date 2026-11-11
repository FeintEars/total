import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import telegramConfig from './telegram.config.js';

@Injectable()
export class TelegramWebhookGuard implements CanActivate {
  constructor(
    @Inject(telegramConfig.KEY)
    private readonly config: ConfigType<typeof telegramConfig>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = Buffer.from(this.config.webhookSecret);
    const header = context
      .switchToHttp()
      .getRequest<Request>()
      .header('x-telegram-bot-api-secret-token');
    if (!expected.length || !header) {
      return false;
    }
    const received = Buffer.from(header);
    return (
      received.length === expected.length && timingSafeEqual(received, expected)
    );
  }
}
