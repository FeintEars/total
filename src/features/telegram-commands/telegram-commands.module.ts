import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramModule } from '../../shared/telegram/telegram.module.js';
import { IbkrModule } from '../account/ibkr/ibkr.module.js';
import { OwnerModule } from '../owner/owner.module.js';
import { TelegramAccessModule } from '../telegram-access/telegram-access.module.js';
import { TelegramCommandIbkrAccount } from './telegram-command-ibkr-account.entity.js';
import { TelegramCommandOwner } from './telegram-command-owner.entity.js';
import { TelegramCommandsBot } from './telegram-commands.bot.js';
import { TelegramCommandsService } from './telegram-commands.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TelegramCommandOwner,
      TelegramCommandIbkrAccount,
    ]),
    TelegramModule,
    OwnerModule,
    IbkrModule,
    TelegramAccessModule,
  ],
  providers: [TelegramCommandsService, TelegramCommandsBot],
  exports: [TypeOrmModule, TelegramCommandsService],
})
export class TelegramCommandsModule {}
