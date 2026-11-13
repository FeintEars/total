import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricesModule } from '../prices/prices.module.js';
import { EarnsBalance } from './earns-balance.entity.js';
import { Earns } from './earns.entity.js';
import { EarnsService } from './earns.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Earns, EarnsBalance]), PricesModule],
  providers: [EarnsService],
  exports: [TypeOrmModule, EarnsService],
})
export class EarnsModule {}
