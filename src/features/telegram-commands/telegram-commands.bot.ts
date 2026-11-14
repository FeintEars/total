import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common';
import { Bot, type Context } from 'grammy';
import { IbkrService } from '../account/ibkr/ibkr.service.js';
import { OwnerService } from '../owner/owner.service.js';
import { TelegramAccessService } from '../telegram-access/telegram-access.service.js';
import {
  BALANCE_ARGUMENT,
  formatCommandList,
  formatFailure,
  formatIbkrBalance,
  formatIbkrSnapshot,
  formatOwnerBalance,
  formatOwnerSnapshot,
  formatUnknownCommand,
  splitMessage,
} from './telegram-commands.format.js';
import {
  ibkrLabel,
  TelegramCommandsService,
  type TelegramCommandIbkrTarget,
  type TelegramCommandOwnerTarget,
} from './telegram-commands.service.js';

const HELP_ALIASES = new Set(['start', 'help']);
const TYPING_INTERVAL_MS = 4_000;
const MENU_MAX_COMMANDS = 100;

type View = 'full' | 'balance';

@Injectable()
export class TelegramCommandsBot
  implements OnModuleInit, OnApplicationBootstrap
{
  private readonly logger = new Logger(TelegramCommandsBot.name);
  private publishedMenu: string | undefined;

  constructor(
    private readonly bot: Bot,
    private readonly commands: TelegramCommandsService,
    private readonly owners: OwnerService,
    private readonly ibkr: IbkrService,
    private readonly access: TelegramAccessService,
  ) {}

  onModuleInit(): void {
    this.bot.on('message:entities:bot_command', (ctx) => this.handle(ctx));
  }

  onApplicationBootstrap(): void {
    void this.syncMenu();
  }

  async handle(ctx: Context): Promise<void> {
    const command = leadingCommand(ctx);
    if (!command || !isAddressedTo(command, ctx.me.username)) {
      return;
    }
    if (!(await this.access.allows(ctx.chat))) {
      this.logger.log(
        `Ignored ${command} in ${ctx.chat?.type ?? 'unknown'} chat ${ctx.chat?.id} from user ${ctx.from?.id}`,
      );
      return;
    }

    const targets = await this.commands.findTargets(command);
    if (targets.owners.length === 0 && targets.ibkrAccounts.length === 0) {
      const available = await this.commands.listCommands();
      await reply(
        ctx,
        HELP_ALIASES.has(targets.alias)
          ? formatCommandList(available)
          : formatUnknownCommand(targets.alias, available),
      );
      return;
    }

    const view = commandView(ctx, command);
    const sections = await whileTyping(
      ctx,
      Promise.all([
        ...targets.owners.map((target) => this.ownerBlocks(target, view)),
        ...targets.ibkrAccounts.map((target) => this.ibkrBlocks(target, view)),
      ]),
    );
    const messages =
      view === 'balance'
        ? splitMessage([sections.flat().join('\n')])
        : sections.flatMap((blocks) => splitMessage(blocks));
    for (const message of messages) {
      await reply(ctx, message);
    }
    await this.syncMenu();
  }

  async syncMenu(): Promise<void> {
    try {
      const menu = (await this.commands.listCommands())
        .slice(0, MENU_MAX_COMMANDS)
        .map(({ alias, description }) => ({ command: alias, description }));
      const serialized = JSON.stringify(menu);
      if (serialized === this.publishedMenu) {
        return;
      }
      await this.bot.api.setMyCommands(menu);
      this.publishedMenu = serialized;
    } catch (error) {
      this.logger.error(
        'Failed to update the bot command menu',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  private async ownerBlocks(
    { ownerId, ownerName }: TelegramCommandOwnerTarget,
    view: View,
  ): Promise<string[]> {
    try {
      const snapshot = await this.owners.getSnapshot(ownerId);
      return view === 'balance'
        ? [formatOwnerBalance(snapshot)]
        : formatOwnerSnapshot(ownerName, snapshot);
    } catch (error) {
      return [this.failure(ownerName, error)];
    }
  }

  private async ibkrBlocks(
    { ibkrAccountId, ownerName }: TelegramCommandIbkrTarget,
    view: View,
  ): Promise<string[]> {
    try {
      const snapshot = await this.ibkr.getAccountSnapshot(ibkrAccountId);
      return view === 'balance'
        ? [formatIbkrBalance(snapshot)]
        : formatIbkrSnapshot(ownerName, snapshot);
    } catch (error) {
      return [this.failure(ibkrLabel(ownerName), error)];
    }
  }

  private failure(label: string, error: unknown): string {
    this.logger.error(
      `${label} snapshot failed`,
      error instanceof Error ? error.stack : error,
    );
    return formatFailure(label, error);
  }
}

function leadingCommand(ctx: Context): string | undefined {
  const text = ctx.msg?.text;
  const entity = ctx.msg?.entities?.find(
    ({ type, offset }) => type === 'bot_command' && offset === 0,
  );
  return text && entity ? text.slice(0, entity.length) : undefined;
}

function commandView(ctx: Context, command: string): View {
  const argument = (ctx.msg?.text ?? '')
    .slice(command.length)
    .trim()
    .split(/\s+/)[0]
    .toLowerCase();
  return argument === BALANCE_ARGUMENT ? 'balance' : 'full';
}

function isAddressedTo(command: string, username: string): boolean {
  const mention = command.split('@')[1];
  return !mention || mention.toLowerCase() === username.toLowerCase();
}

async function reply(ctx: Context, text: string): Promise<void> {
  await ctx.reply(text, {
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
  });
}

async function whileTyping<T>(ctx: Context, work: Promise<T>): Promise<T> {
  const typing = () => {
    ctx.replyWithChatAction('typing').catch(() => undefined);
  };
  typing();
  const timer = setInterval(typing, TYPING_INTERVAL_MS);
  try {
    return await work;
  } finally {
    clearInterval(timer);
  }
}
