import type { Seed } from '../../../shared/database/seed.interface.js';
import { Owner } from '../owner.entity.js';

export const JOHN_DOE_ID = '00000000-0000-4000-8000-000000000001';

export default {
  async run(manager) {
    await manager
      .createQueryBuilder()
      .insert()
      .into(Owner)
      .values({ id: JOHN_DOE_ID, name: 'John Doe' })
      .orIgnore()
      .execute();
  },
} satisfies Seed;
