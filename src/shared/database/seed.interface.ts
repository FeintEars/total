import type { EntityManager } from 'typeorm';

export interface Seed {
  run(manager: EntityManager): Promise<void>;
}
