import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Chat } from 'grammy/types';
import type { Repository } from 'typeorm';
import { TelegramAllowedChat } from './telegram-allowed-chat.entity.js';
import { TelegramAllowedUser } from './telegram-allowed-user.entity.js';

@Injectable()
export class TelegramAccessService {
  constructor(
    @InjectRepository(TelegramAllowedUser)
    private readonly users: Repository<TelegramAllowedUser>,
    @InjectRepository(TelegramAllowedChat)
    private readonly chats: Repository<TelegramAllowedChat>,
  ) {}

  async allows(chat: Pick<Chat, 'id' | 'type'> | undefined): Promise<boolean> {
    switch (chat?.type) {
      case 'private':
        return this.users.existsBy({ userId: String(chat.id) });
      case 'group':
      case 'supergroup':
        return this.chats.existsBy({ chatId: String(chat.id) });
      default:
        return false;
    }
  }
}
