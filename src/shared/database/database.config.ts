import { registerAs } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

// Same variables as docker-compose.yml, so one .env drives both.
export default registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER ?? 'postgres',
  password: process.env.POSTGRES_PASSWORD ?? 'postgres',
  database: process.env.POSTGRES_DB ?? 'total',
  autoLoadEntities: true,
  // Never enable in production: it alters the schema to match the entities.
  synchronize: process.env.POSTGRES_SYNCHRONIZE === 'true',
}));
