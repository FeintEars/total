import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { TelegramModule } from '../telegram/telegram.module.js';
import { OwnerModule } from '../../features/owner/owner.module.js';
import { AccountModule } from '../../features/account/account.module.js';
import { InputsModule } from '../../features/inputs/inputs.module.js';
import { TelegramCommandsModule } from '../../features/telegram-commands/telegram-commands.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'total',
    }),
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    DatabaseModule,
    TelegramModule,
    OwnerModule,
    AccountModule,
    InputsModule,
    TelegramCommandsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
