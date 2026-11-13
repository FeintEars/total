import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IbkrAccount } from './ibkr-account.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([IbkrAccount])],
  exports: [TypeOrmModule],
})
export class IbkrModule {}
