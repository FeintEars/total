import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PolymarketAccount } from './polymarket-account.entity.js';
import polymarketConfig from './polymarket.config.js';
import { PolymarketService } from './polymarket.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([PolymarketAccount]),
    ConfigModule.forFeature(polymarketConfig),
  ],
  providers: [PolymarketService],
  exports: [TypeOrmModule, PolymarketService],
})
export class PolymarketModule {}
