import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CronModule } from '../../shared/cron/cron.module.js';
import { TelegramModule } from '../../shared/telegram/telegram.module.js';
import { TelegramCommandsModule } from '../telegram-commands/telegram-commands.module.js';
import { TelegramSubscription } from './telegram-subscription.entity.js';
import { TelegramSubscriptionsController } from './telegram-subscriptions.controller.js';
import { TelegramSubscriptionsService } from './telegram-subscriptions.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramSubscription]),
    CronModule,
    TelegramModule,
    TelegramCommandsModule,
  ],
  controllers: [TelegramSubscriptionsController],
  providers: [TelegramSubscriptionsService],
})
export class TelegramSubscriptionsModule {}
