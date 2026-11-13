import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EarnsBalance } from './earns-balance.entity.js';
import { Earns } from './earns.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Earns, EarnsBalance])],
  exports: [TypeOrmModule],
})
export class EarnsModule {}
