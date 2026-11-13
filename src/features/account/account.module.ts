import { Module } from '@nestjs/common';
import {
  ACCOUNT_SNAPSHOT_SOURCES,
  type AccountSnapshotSource,
} from './account-snapshot.interface.js';
import { BinanceModule } from './binance/binance.module.js';
import { BinanceService } from './binance/binance.service.js';
import { BybitModule } from './bybit/bybit.module.js';
import { BybitService } from './bybit/bybit.service.js';
import { EarnsModule } from './earns/earns.module.js';
import { EarnsService } from './earns/earns.service.js';
import { IbkrModule } from './ibkr/ibkr.module.js';
import { IbkrService } from './ibkr/ibkr.service.js';
import { PolymarketModule } from './polymarket/polymarket.module.js';
import { PolymarketService } from './polymarket/polymarket.service.js';

const SNAPSHOT_SOURCES = [
  IbkrService,
  BinanceService,
  BybitService,
  EarnsService,
  PolymarketService,
];

@Module({
  imports: [
    IbkrModule,
    BinanceModule,
    BybitModule,
    EarnsModule,
    PolymarketModule,
  ],
  providers: [
    {
      provide: ACCOUNT_SNAPSHOT_SOURCES,
      inject: SNAPSHOT_SOURCES,
      useFactory: (
        ...sources: AccountSnapshotSource<{ id: string }>[]
      ): AccountSnapshotSource<{ id: string }>[] => sources,
    },
  ],
  exports: [
    IbkrModule,
    BinanceModule,
    BybitModule,
    EarnsModule,
    PolymarketModule,
    ACCOUNT_SNAPSHOT_SOURCES,
  ],
})
export class AccountModule {}
