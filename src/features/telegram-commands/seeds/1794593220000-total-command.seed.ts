import type { Seed } from '../../../shared/database/seed.interface.js';
import { JOHN_DOE_ID } from '../../owner/seeds/1794592800000-john-doe.seed.js';
import { TelegramCommandOwner } from '../telegram-command-owner.entity.js';

export default {
  async run(manager) {
    await manager
      .createQueryBuilder()
      .insert()
      .into(TelegramCommandOwner)
      .values({
        id: '00000000-0000-4000-8000-000000000401',
        alias: 'total',
        ownerId: JOHN_DOE_ID,
      })
      .orIgnore()
      .execute();
  },
} satisfies Seed;
