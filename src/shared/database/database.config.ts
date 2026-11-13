import { registerAs } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { postgresOptions } from './database.options.js';

export default registerAs('database', (): TypeOrmModuleOptions => ({
  ...postgresOptions(),
  autoLoadEntities: true,
  synchronize: process.env.POSTGRES_SYNCHRONIZE === 'true',
}));
