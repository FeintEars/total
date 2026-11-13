import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BybitAccount } from './bybit-account.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([BybitAccount])],
  exports: [TypeOrmModule],
})
export class BybitModule {}
