import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Chat } from 'grammy/types';
import type { Repository } from 'typeorm';
import { TelegramAllowedChat } from './telegram-allowed-chat.entity.js';

const ALLOWED_CHAT_TYPES = new Set<Chat['type']>([
  'private',
  'group',
  'supergroup',
]);

@Injectable()
export class TelegramAccessService {
  constructor(
    @InjectRepository(TelegramAllowedChat)
    private readonly chats: Repository<TelegramAllowedChat>,
  ) {}

  async allows(chat: Pick<Chat, 'id' | 'type'> | undefined): Promise<boolean> {
    if (!chat || !ALLOWED_CHAT_TYPES.has(chat.type)) {
      return false;
    }
    return this.chats.existsBy({ chatId: String(chat.id) });
  }
}
