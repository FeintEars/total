import { Module } from '@nestjs/common';
import { PricesService } from './prices.service.js';

@Module({
  providers: [PricesService],
  exports: [PricesService],
})
export class PricesModule {}
