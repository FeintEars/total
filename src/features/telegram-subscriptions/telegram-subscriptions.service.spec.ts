import { TelegramSubscriptionsService } from './telegram-subscriptions.service.js';

function setup(
  subscriptions: { chatId: string; cmd: string }[],
  reports: Record<string, string[] | undefined>,
) {
  const repository = { find: vi.fn().mockResolvedValue(subscriptions) };
  const api = { sendMessage: vi.fn().mockResolvedValue(undefined) };
  const commands = {
    report: vi.fn(async (cmd: string) => reports[cmd]),
  };
  const service = new TelegramSubscriptionsService(
    repository as never,
    { api } as never,
    commands as never,
  );
  return { service, api, commands };
}

describe('TelegramSubscriptionsService.sendAll', () => {
  it('sends every message of the report to its chat', async () => {
    const { service, api } = setup(
      [
        { chatId: '123456789', cmd: '/john' },
        { chatId: '-1001234567890', cmd: '/total balance' },
      ],
      { '/john': ['first', 'second'], '/total balance': ['10.00 USD'] },
    );

    await expect(service.sendAll()).resolves.toEqual({ sent: 2, failed: 0 });
    expect(
      api.sendMessage.mock.calls.map(([chatId, text]) => [chatId, text]),
    ).toEqual([
      ['123456789', 'first'],
      ['-1001234567890', '10.00 USD'],
      ['123456789', 'second'],
    ]);
    expect(api.sendMessage).toHaveBeenCalledWith(
      '123456789',
      'first',
      expect.objectContaining({ parse_mode: 'HTML' }),
    );
  });

  it('builds a report once for chats sharing a command', async () => {
    const { service, commands } = setup(
      [
        { chatId: '1', cmd: '/john' },
        { chatId: '2', cmd: ' /john ' },
      ],
      { '/john': ['report'] },
    );

    await service.sendAll();

    expect(commands.report).toHaveBeenCalledTimes(1);
  });

  it('keeps sending when a chat refuses or a command is unknown', async () => {
    const { service, api } = setup(
      [
        { chatId: '1', cmd: '/john' },
        { chatId: '2', cmd: '/nope' },
        { chatId: '3', cmd: '/john' },
      ],
      { '/john': ['report'] },
    );
    api.sendMessage.mockImplementation(async (chatId: string) => {
      if (chatId === '1') {
        throw new Error(
          "Forbidden: bot can't initiate conversation with a user",
        );
      }
    });

    await expect(service.sendAll()).resolves.toEqual({ sent: 1, failed: 2 });
    expect(api.sendMessage).toHaveBeenCalledWith(
      '3',
      'report',
      expect.anything(),
    );
  });
});
