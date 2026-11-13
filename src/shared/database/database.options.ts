import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';

const featuresDir = join(import.meta.dirname, '..', '..', 'features');

export const migrationsGlob = join(featuresDir, '**', 'migrations', '*.js');
export const entitiesGlob = join(featuresDir, '**', '*.entity.js');

export function postgresOptions() {
  return {
    type: 'postgres',
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    username: process.env.POSTGRES_USER ?? 'postgres',
    password: process.env.POSTGRES_PASSWORD ?? 'postgres',
    database: process.env.POSTGRES_DB ?? 'total',
    migrations: [migrationsGlob],
    migrationsTableName: 'migrations',
  } satisfies DataSourceOptions;
}
