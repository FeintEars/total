import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IbkrAccount } from './ibkr-account.entity.js';
import { IbkrController } from './ibkr.controller.js';
import { IbkrService } from './ibkr.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([IbkrAccount]), CacheModule.register()],
  controllers: [IbkrController],
  providers: [IbkrService],
  exports: [TypeOrmModule, IbkrService],
})
export class IbkrModule {}
