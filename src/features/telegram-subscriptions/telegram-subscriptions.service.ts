import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Bot } from 'grammy';
import type { Repository } from 'typeorm';
import { TelegramCommandsBot } from '../telegram-commands/telegram-commands.bot.js';
import { MESSAGE_OPTIONS } from '../telegram-commands/telegram-commands.format.js';
import { TelegramSubscription } from './telegram-subscription.entity.js';

export interface TelegramSubscriptionsResult {
  sent: number;
  failed: number;
}

@Injectable()
export class TelegramSubscriptionsService {
  private readonly logger = new Logger(TelegramSubscriptionsService.name);

  constructor(
    @InjectRepository(TelegramSubscription)
    private readonly subscriptions: Repository<TelegramSubscription>,
    private readonly bot: Bot,
    private readonly commands: TelegramCommandsBot,
  ) {}

  async sendAll(): Promise<TelegramSubscriptionsResult> {
    const subscriptions = await this.subscriptions.find();
    const reports = new Map(
      [...new Set(subscriptions.map(({ cmd }) => cmd.trim()))].map((cmd) => [
        cmd,
        this.commands.report(cmd),
      ]),
    );

    const results = await Promise.all(
      subscriptions.map(async ({ chatId, cmd }) => {
        try {
          const messages = await reports.get(cmd.trim());
          if (!messages) {
            throw new Error(`Unknown command ${cmd}`);
          }
          for (const message of messages) {
            await this.bot.api.sendMessage(chatId, message, MESSAGE_OPTIONS);
          }
          return true;
        } catch (error) {
          this.logger.error(
            `Failed to send ${cmd} to chat ${chatId}`,
            error instanceof Error ? error.stack : error,
          );
          return false;
        }
      }),
    );

    const sent = results.filter(Boolean).length;
    const result = { sent, failed: results.length - sent };
    this.logger.log(
      `Sent ${result.sent} subscriptions, ${result.failed} failed`,
    );
    return result;
  }
}
