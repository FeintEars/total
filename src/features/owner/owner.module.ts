import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountModule } from '../account/account.module.js';
import { InputsModule } from '../inputs/inputs.module.js';
import { OwnerController } from './owner.controller.js';
import { Owner } from './owner.entity.js';
import { OwnerService } from './owner.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Owner]), AccountModule, InputsModule],
  controllers: [OwnerController],
  providers: [OwnerService],
  exports: [TypeOrmModule, OwnerService],
})
export class OwnerModule {}
