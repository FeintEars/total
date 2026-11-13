import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricesModule } from '../prices/prices.module.js';
import { BinanceAccount } from './binance-account.entity.js';
import { BinanceService } from './binance.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([BinanceAccount]), PricesModule],
  providers: [BinanceService],
  exports: [TypeOrmModule, BinanceService],
})
export class BinanceModule {}
