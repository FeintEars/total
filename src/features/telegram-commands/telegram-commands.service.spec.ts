import { TelegramCommandsService } from './telegram-commands.service.js';

function repository(rows: object[]) {
  return { find: vi.fn().mockResolvedValue(rows) };
}

function service() {
  const owners = repository([
    { alias: 'total', ownerId: 'owner-2', owner: { name: 'Serhii Zubkov' } },
    { alias: 'total', ownerId: 'owner-1', owner: { name: 'John Doe' } },
  ]);
  const ibkrAccounts = repository([
    {
      alias: 'ibkr',
      ibkrAccountId: 'ibkr-1',
      ibkrAccount: { owner: { name: 'Serhii Zubkov' } },
    },
    {
      alias: 'total',
      ibkrAccountId: 'ibkr-2',
      ibkrAccount: { owner: { name: 'John Doe' } },
    },
  ]);
  return {
    owners,
    ibkrAccounts,
    commands: new TelegramCommandsService(
      owners as never,
      ibkrAccounts as never,
    ),
  };
}

describe('TelegramCommandsService.findTargets', () => {
  it('collects every owner and IBKR account bound to the alias', async () => {
    const { owners, ibkrAccounts, commands } = service();

    const targets = await commands.findTargets('/Total@mr_total_bot');

    expect(owners.find).toHaveBeenCalledWith({
      where: { alias: 'total' },
      relations: { owner: true },
    });
    expect(ibkrAccounts.find).toHaveBeenCalledWith({
      where: { alias: 'total' },
      relations: { ibkrAccount: { owner: true } },
    });
    expect(targets.alias).toBe('total');
    expect(targets.owners).toEqual([
      { ownerId: 'owner-1', ownerName: 'John Doe' },
      { ownerId: 'owner-2', ownerName: 'Serhii Zubkov' },
    ]);
  });
});

describe('TelegramCommandsService.listCommands', () => {
  it('describes every alias by the owners and IBKR accounts it shows', async () => {
    const { commands } = service();

    await expect(commands.listCommands()).resolves.toEqual([
      { alias: 'ibkr', description: 'IBKR · Serhii Zubkov' },
      {
        alias: 'total',
        description: 'John Doe, Serhii Zubkov, IBKR · John Doe',
      },
    ]);
  });
});
