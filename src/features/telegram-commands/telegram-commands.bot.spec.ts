import { TelegramCommandsBot } from './telegram-commands.bot.js';

function context(text: string) {
  const command = text.split(' ')[0];
  return {
    chat: { id: 123456789, type: 'private' },
    from: { id: 123456789 },
    msg: {
      text,
      entities: [{ type: 'bot_command', offset: 0, length: command.length }],
    },
    me: { username: 'mr_total_bot' },
    reply: vi.fn().mockResolvedValue(undefined),
    replyWithChatAction: vi.fn().mockResolvedValue(true),
  };
}

function setup(
  targets: {
    owners?: { ownerId: string; ownerName: string }[];
    ibkrAccounts?: { ibkrAccountId: string; ownerName: string }[];
  },
  allowed = true,
) {
  const commands = {
    findTargets: vi.fn(async (command: string) => ({
      alias: command.slice(1).split('@')[0],
      owners: targets.owners ?? [],
      ibkrAccounts: targets.ibkrAccounts ?? [],
    })),
    listCommands: vi
      .fn()
      .mockResolvedValue([{ alias: 'total', description: 'Serhii Zubkov' }]),
  };
  const owners = {
    getSnapshot: vi.fn().mockResolvedValue({
      ownerId: 'owner-1',
      takenAt: '2026-11-14T00:44:00.000Z',
      totalAmount: 10,
      totalCurrency: 'USD',
      inputs: [],
      outputs: [],
      errors: [],
    }),
  };
  const ibkr = {
    getAccountSnapshot: vi.fn().mockRejectedValue(new Error('IBKR is down')),
  };
  const access = { allows: vi.fn().mockResolvedValue(allowed) };
  const api = { setMyCommands: vi.fn().mockResolvedValue(true) };
  const bot = new TelegramCommandsBot(
    { api } as never,
    commands as never,
    owners as never,
    ibkr as never,
    access as never,
  );
  return { bot, commands, ibkr, access, api };
}

describe('TelegramCommandsBot.handle', () => {
  it('sends one message per target and reports a failing one', async () => {
    const { bot } = setup({
      owners: [{ ownerId: 'owner-1', ownerName: 'Serhii Zubkov' }],
      ibkrAccounts: [{ ibkrAccountId: 'ibkr-1', ownerName: 'Serhii Zubkov' }],
    });
    const ctx = context('/total');

    await bot.handle(ctx as never);

    expect(ctx.replyWithChatAction).toHaveBeenCalledWith('typing');
    expect(ctx.reply.mock.calls.map(([text]) => text)).toEqual([
      '<b>Serhii Zubkov</b> — 10.00 USD\n\n<i>Nov 14, 2026, 00:44 UTC</i>',
      '⚠️ <b>IBKR · Serhii Zubkov</b>: IBKR is down',
    ]);
  });

  it('sends only the USD totals in one message for the balance argument', async () => {
    const { bot, ibkr } = setup({
      owners: [{ ownerId: 'owner-1', ownerName: 'Serhii Zubkov' }],
      ibkrAccounts: [
        { ibkrAccountId: 'ibkr-1', ownerName: 'Serhii Zubkov' },
        { ibkrAccountId: 'ibkr-2', ownerName: 'John Doe' },
      ],
    });
    ibkr.getAccountSnapshot.mockImplementation(async (id: string) => {
      if (id === 'ibkr-2') {
        throw new Error('IBKR is down');
      }
      return {
        accountId: id,
        takenAt: '2026-11-14T00:44:00.000Z',
        totalAmount: 2825.02,
        totalCurrency: 'USD',
        asOf: '2026-11-12',
        positions: [{ name: 'Cash', amount: 2825.02, currency: 'USD' }],
      };
    });
    const ctx = context('/total@mr_total_bot  Balance');

    await bot.handle(ctx as never);

    expect(ctx.reply.mock.calls.map(([text]) => text)).toEqual([
      [
        '<b>Serhii Zubkov</b> — 10.00 USD',
        '<b>IBKR · Serhii Zubkov</b> — 2,825.02 USD',
        '⚠️ <b>IBKR · John Doe</b>: IBKR is down',
      ].join('\n'),
    ]);
  });

  it('shows the full report for an unknown argument', async () => {
    const { bot } = setup({
      owners: [{ ownerId: 'owner-1', ownerName: 'Serhii Zubkov' }],
    });
    const ctx = context('/total something');

    await bot.handle(ctx as never);

    expect(ctx.reply.mock.calls.map(([text]) => text)).toEqual([
      '<b>Serhii Zubkov</b> — 10.00 USD\n\n<i>Nov 14, 2026, 00:44 UTC</i>',
    ]);
  });

  it('answers an unknown command with the available ones', async () => {
    const { bot } = setup({});
    const ctx = context('/nope');

    await bot.handle(ctx as never);

    expect(ctx.reply).toHaveBeenCalledWith(
      'Unknown command /nope.\n\nAvailable commands:\n/total — Serhii Zubkov\n\nAdd balance for the USD total only: /total balance',
      expect.objectContaining({ parse_mode: 'HTML' }),
    );
  });

  it('answers /start with the available commands', async () => {
    const { bot } = setup({});
    const ctx = context('/start');

    await bot.handle(ctx as never);

    expect(ctx.reply).toHaveBeenCalledWith(
      'Available commands:\n/total — Serhii Zubkov\n\nAdd balance for the USD total only: /total balance',
      expect.anything(),
    );
  });

  it('ignores a command addressed to another bot', async () => {
    const { bot, commands } = setup({});
    const ctx = context('/total@other_bot');

    await bot.handle(ctx as never);

    expect(commands.findTargets).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it('stays silent in a chat without access', async () => {
    const { bot, commands, access } = setup({}, false);
    const ctx = context('/total');

    await bot.handle(ctx as never);

    expect(access.allows).toHaveBeenCalledWith(ctx.chat);
    expect(commands.findTargets).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
    expect(ctx.replyWithChatAction).not.toHaveBeenCalled();
  });
});

describe('TelegramCommandsBot.syncMenu', () => {
  it('publishes the menu only when the commands change', async () => {
    const { bot, commands, api } = setup({});

    await bot.syncMenu();
    await bot.syncMenu();
    commands.listCommands.mockResolvedValue([
      { alias: 'ibkr', description: 'IBKR · Serhii Zubkov' },
    ]);
    await bot.syncMenu();

    expect(api.setMyCommands).toHaveBeenCalledTimes(2);
    expect(api.setMyCommands).toHaveBeenLastCalledWith([
      { command: 'ibkr', description: 'IBKR · Serhii Zubkov' },
    ]);
  });
});
