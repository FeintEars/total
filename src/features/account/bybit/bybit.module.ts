import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricesModule } from '../prices/prices.module.js';
import { BybitAccount } from './bybit-account.entity.js';
import { BybitService } from './bybit.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([BybitAccount]), PricesModule],
  providers: [BybitService],
  exports: [TypeOrmModule, BybitService],
})
export class BybitModule {}
