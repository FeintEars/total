import { Module } from '@nestjs/common';
import { BinanceModule } from './binance/binance.module.js';
import { BybitModule } from './bybit/bybit.module.js';
import { EarnsModule } from './earns/earns.module.js';
import { IbkrModule } from './ibkr/ibkr.module.js';
import { PolymarketModule } from './polymarket/polymarket.module.js';

@Module({
  imports: [
    IbkrModule,
    BinanceModule,
    BybitModule,
    EarnsModule,
    PolymarketModule,
  ],
  exports: [
    IbkrModule,
    BinanceModule,
    BybitModule,
    EarnsModule,
    PolymarketModule,
  ],
})
export class AccountModule {}
