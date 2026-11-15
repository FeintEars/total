import { NotFoundException } from '@nestjs/common';
import type {
  AccountKind,
  AccountSnapshotSource,
} from '../account/account-snapshot.interface.js';
import type { InputsService } from '../inputs/inputs.service.js';
import type { SnapshotsService } from '../snapshots/snapshots.service.js';
import { OwnerService } from './owner.service.js';

const OWNER_ID = '00000000-0000-4000-8000-000000000001';

function source(
  name: string,
  kind: AccountKind,
  ids: string[],
  getSnapshot: AccountSnapshotSource<{ id: string }>['getSnapshot'],
) {
  return {
    name,
    kind,
    findByOwner: vi.fn().mockResolvedValue(ids.map((id) => ({ id }))),
    getSnapshot: vi.fn(getSnapshot),
  } satisfies AccountSnapshotSource<{ id: string }>;
}

function service(
  sources: AccountSnapshotSource<{ id: string }>[],
  ownerExists = true,
) {
  const owners = { existsBy: vi.fn().mockResolvedValue(ownerExists) };
  const inputs = {
    findByOwner: vi.fn().mockResolvedValue([
      {
        name: 'Deposit',
        amount: '1000.50',
        currency: 'USD',
        createdAt: new Date('2025-01-01T00:00:00Z'),
      },
    ]),
  } as unknown as InputsService;
  const snapshots = { record: vi.fn().mockResolvedValue(undefined) };
  return {
    owners: new OwnerService(
      owners as never,
      inputs,
      sources,
      snapshots as unknown as SnapshotsService,
    ),
    record: snapshots.record,
  };
}

describe('OwnerService.getSnapshot', () => {
  it('collects inputs and a snapshot of every account of the owner', async () => {
    const ibkr = source(
      'IBKR',
      'stocks',
      ['ibkr-1', 'ibkr-2'],
      async ({ id }) => ({
        usdAmount: id === 'ibkr-1' ? 100.004 : 200,
        asOf: '2026-11-12',
        positions: [
          { name: 'Inflation Hedge', amount: 99.999, currency: 'PLN' },
        ],
      }),
    );
    const earns = {
      ...source('Earns', 'crypto', ['earns-1'], async () => ({
        usdAmount: 5,
        asOf: '2026-11-14',
        positions: [
          { name: 'GRAM', quantity: 3, amount: null, currency: 'USD' },
        ],
      })),
      accountName: () => 'Telegram Wallet',
    };

    const { owners, record } = service([ibkr, earns]);
    const snapshot = await owners.getSnapshot(OWNER_ID);

    expect(ibkr.findByOwner).toHaveBeenCalledWith(OWNER_ID);
    expect(snapshot.inputs).toEqual([
      {
        name: 'Deposit',
        amount: 1000.5,
        currency: 'USD',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
    ]);
    expect(snapshot.outputs).toEqual([
      {
        id: 'ibkr-1',
        source: 'IBKR',
        name: 'IBKR',
        amount: 100,
        currency: 'USD',
        positions: [{ name: 'Inflation Hedge', amount: 100, currency: 'PLN' }],
        asOf: '2026-11-12',
      },
      expect.objectContaining({ id: 'ibkr-2', name: 'IBKR', amount: 200 }),
      expect.objectContaining({
        id: 'earns-1',
        source: 'Earns',
        name: 'Telegram Wallet',
        amount: 5,
        currency: 'USD',
        positions: [
          { name: 'GRAM', quantity: 3, amount: null, currency: 'USD' },
        ],
      }),
    ]);
    expect(snapshot.totalAmount).toBe(305);
    expect(snapshot.totalCurrency).toBe('USD');
    expect(snapshot.errors).toEqual([]);
    expect(record).toHaveBeenCalledExactlyOnceWith({
      ownerId: OWNER_ID,
      takenAt: snapshot.takenAt,
      amountStocks: 300,
      amountCrypto: 5,
      amountInputs: 1000.5,
    });
  });

  it('reports a failing account in errors without failing the others', async () => {
    const binance = source('Binance', 'crypto', ['binance-1'], async () => {
      throw new Error('Invalid API-key');
    });
    const bybit = source('Bybit', 'crypto', ['bybit-1'], async () => ({
      usdAmount: 1,
      asOf: '2026-11-14',
      positions: [],
    }));

    const { owners, record } = service([binance, bybit]);
    const snapshot = await owners.getSnapshot(OWNER_ID);

    expect(snapshot.outputs.map(({ id }) => id)).toEqual(['bybit-1']);
    expect(snapshot.errors).toEqual([
      { id: 'binance-1', name: 'Binance', message: 'Invalid API-key' },
    ]);
    expect(record).not.toHaveBeenCalled();
  });

  it('does not record a snapshot of an owner without accounts', async () => {
    const { owners, record } = service([
      source('Bybit', 'crypto', [], vi.fn()),
    ]);

    const snapshot = await owners.getSnapshot(OWNER_ID);

    expect(snapshot.outputs).toEqual([]);
    expect(record).not.toHaveBeenCalled();
  });

  it('throws NotFoundException for an unknown owner', async () => {
    const { owners, record } = service([], false);

    await expect(owners.getSnapshot(OWNER_ID)).rejects.toThrow(
      NotFoundException,
    );
    expect(record).not.toHaveBeenCalled();
  });
});
