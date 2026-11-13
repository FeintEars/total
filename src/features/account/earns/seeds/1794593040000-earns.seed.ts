import type { Seed } from '../../../../shared/database/seed.interface.js';
import { JOHN_DOE_ID } from '../../../owner/seeds/1794592800000-john-doe.seed.js';
import { EarnsBalance } from '../earns-balance.entity.js';
import { Earns } from '../earns.entity.js';

const EARNS_ID = '00000000-0000-4000-8000-000000000101';

export default {
  async run(manager) {
    await manager
      .createQueryBuilder()
      .insert()
      .into(Earns)
      .values({ id: EARNS_ID, name: 'Telegram Walt', ownerId: JOHN_DOE_ID })
      .orIgnore()
      .execute();

    await manager
      .createQueryBuilder()
      .insert()
      .into(EarnsBalance)
      .values([
        {
          id: '00000000-0000-4000-8000-000000000201',
          name: 'USDT Earn',
          amount: '1000',
          currency: 'USDT',
          apy: '10',
          earnsId: EARNS_ID,
          updatedAt: new Date('2020-01-01T00:00:00Z'),
        },
        {
          id: '00000000-0000-4000-8000-000000000202',
          name: 'XAUT Earn',
          amount: '1',
          currency: 'XAUT',
          apy: '0.5',
          earnsId: EARNS_ID,
          updatedAt: new Date('2025-01-01T00:00:00Z'),
        },
      ])
      .orIgnore()
      .execute();
  },
} satisfies Seed;
