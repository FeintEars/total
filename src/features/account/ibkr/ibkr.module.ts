import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IbkrAccount } from './ibkr-account.entity.js';
import { IbkrService } from './ibkr.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([IbkrAccount])],
  providers: [IbkrService],
  exports: [TypeOrmModule, IbkrService],
})
export class IbkrModule {}
