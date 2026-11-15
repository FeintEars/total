import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { CronGuard } from '../../shared/cron/cron.guard.js';
import {
  TelegramSubscriptionsService,
  type TelegramSubscriptionsResult,
} from './telegram-subscriptions.service.js';

@Controller('telegram/subscriptions')
export class TelegramSubscriptionsController {
  constructor(private readonly subscriptions: TelegramSubscriptionsService) {}

  @Post('send')
  @HttpCode(200)
  @UseGuards(CronGuard)
  send(): Promise<TelegramSubscriptionsResult> {
    return this.subscriptions.sendAll();
  }
}
