import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './database.config.js';

@Module({
  imports: [TypeOrmModule.forRootAsync(databaseConfig.asProvider())],
})
export class DatabaseModule {}
