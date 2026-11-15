import { SnapshotsService } from './snapshots.service.js';

const OWNER_ID = '00000000-0000-4000-8000-000000000001';
const RECORD = {
  ownerId: OWNER_ID,
  takenAt: '2026-11-15T08:00:00.000Z',
  amountStocks: 0.1,
  amountCrypto: 0.2,
  amountInputs: 1000.5,
};

describe('SnapshotsService.record', () => {
  it('inserts the owner totals taken at the snapshot time', async () => {
    const insert = vi.fn().mockResolvedValue(undefined);

    await new SnapshotsService({ insert } as never).record(RECORD);

    expect(insert).toHaveBeenCalledExactlyOnceWith({
      ownerId: OWNER_ID,
      amount: '0.3',
      amountStocks: '0.1',
      amountCrypto: '0.2',
      amountInputs: '1000.5',
      createdAt: new Date('2026-11-15T08:00:00.000Z'),
    });
  });

  it('does not throw when the insert fails', async () => {
    const insert = vi.fn().mockRejectedValue(new Error('connection lost'));

    await expect(
      new SnapshotsService({ insert } as never).record(RECORD),
    ).resolves.toBeUndefined();
  });
});
