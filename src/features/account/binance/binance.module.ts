import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BinanceAccount } from './binance-account.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([BinanceAccount])],
  exports: [TypeOrmModule],
})
export class BinanceModule {}
