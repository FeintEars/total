import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramAccessService } from './telegram-access.service.js';
import { TelegramAllowedChat } from './telegram-allowed-chat.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([TelegramAllowedChat])],
  providers: [TelegramAccessService],
  exports: [TypeOrmModule, TelegramAccessService],
})
export class TelegramAccessModule {}
