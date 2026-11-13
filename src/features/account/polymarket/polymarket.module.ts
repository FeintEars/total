import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PolymarketAccount } from './polymarket-account.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([PolymarketAccount])],
  exports: [TypeOrmModule],
})
export class PolymarketModule {}
