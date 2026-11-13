import type { Seed } from '../../../shared/database/seed.interface.js';
import { JOHN_DOE_ID } from '../../owner/seeds/1794592800000-john-doe.seed.js';
import { Input } from '../input.entity.js';

export default {
  async run(manager) {
    await manager
      .createQueryBuilder()
      .insert()
      .into(Input)
      .values([
        {
          id: '00000000-0000-4000-8000-000000000301',
          name: 'USDT Earn',
          amount: '1000',
          currency: 'USD',
          ownerId: JOHN_DOE_ID,
          createdAt: new Date('2020-01-01T00:00:00Z'),
        },
        {
          id: '00000000-0000-4000-8000-000000000302',
          name: 'XAUT Earn',
          amount: '2628.2',
          currency: 'USD',
          ownerId: JOHN_DOE_ID,
          createdAt: new Date('2025-01-01T00:00:00Z'),
        },
      ])
      .orIgnore()
      .execute();
  },
} satisfies Seed;
