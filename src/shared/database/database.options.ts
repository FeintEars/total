import { join } from 'node:path';
import pg from 'pg';
import type { DataSourceOptions } from 'typeorm';

const featuresDir = join(import.meta.dirname, '..', '..', 'features');

export const migrationsGlob = join(featuresDir, '**', 'migrations', '*.js');
export const entitiesGlob = join(featuresDir, '**', '*.entity.js');

export function postgresOptions() {
  const common = {
    type: 'postgres' as const,
    driver: pg,
    migrations: [migrationsGlob],
    migrationsTableName: 'migrations',
  };
  const url = process.env.DATABASE_URL;
  if (url) {
    return { ...common, url } satisfies DataSourceOptions;
  }
  return {
    ...common,
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    username: process.env.POSTGRES_USER ?? 'postgres',
    password: process.env.POSTGRES_PASSWORD ?? 'postgres',
    database: process.env.POSTGRES_DB ?? 'total',
  } satisfies DataSourceOptions;
}
