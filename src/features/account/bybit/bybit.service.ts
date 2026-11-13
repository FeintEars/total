import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { fetchJson, toNumber } from '../../../shared/http/http.js';
import type {
  AccountSnapshot,
  AccountSnapshotSource,
} from '../account-snapshot.interface.js';
import { mergePositions, sumAmounts, todayAsOf } from '../positions.js';
import {
  PricesService,
  type UsdPrices,
  usdPosition,
} from '../prices/prices.service.js';
import { BybitAccount } from './bybit-account.entity.js';

const BASE_URL = 'https://api.bybit.com';
const TICKERS_URL = `${BASE_URL}/v5/market/tickers?category=spot`;
const RECV_WINDOW = '10000';
const EARN_CATEGORIES = ['FlexibleSaving', 'OnChain'] as const;

interface BybitResponse<T> {
  retCode: number;
  retMsg: string;
  result: T;
}

interface UnifiedWallet {
  list: {
    totalEquity: string;
    coin: { coin: string; equity: string; usdValue: string }[];
  }[];
}

interface FundingWallet {
  balance: { coin: string; walletBalance: string }[];
}

interface SpotTickers {
  list: { symbol: string; lastPrice: string }[];
}

interface EarnPositions {
  list: { coin: string; amount: string }[];
}

@Injectable()
export class BybitService implements AccountSnapshotSource<BybitAccount> {
  readonly name = 'Bybit';

  constructor(
    @InjectRepository(BybitAccount)
    private readonly accounts: Repository<BybitAccount>,
    private readonly prices: PricesService,
  ) {}

  findByOwner(ownerId: string): Promise<BybitAccount[]> {
    return this.accounts.findBy({ ownerId });
  }

  async getSnapshot(account: BybitAccount): Promise<AccountSnapshot> {
    const [prices, unified, funding, ...earns] = await Promise.all([
      this.usdPrices(),
      this.get<UnifiedWallet>(account, '/v5/account/wallet-balance', {
        accountType: 'UNIFIED',
      }),
      this.get<FundingWallet>(
        account,
        '/v5/asset/transfer/query-account-coins-balance',
        { accountType: 'FUND' },
      ),
      ...EARN_CATEGORIES.map((category) =>
        this.get<EarnPositions>(account, '/v5/earn/position', { category }),
      ),
    ]);

    const unifiedPositions = unified.list.flatMap((wallet) =>
      wallet.coin.map((coin) => ({
        name: coin.coin,
        quantity: toNumber(coin.equity),
        amount: toNumber(coin.usdValue),
        currency: 'USD',
      })),
    );
    const otherPositions = [
      ...funding.balance.map((b) =>
        usdPosition(prices, b.coin, toNumber(b.walletBalance)),
      ),
      ...earns.flatMap((earn) =>
        earn.list.map((p) => usdPosition(prices, p.coin, toNumber(p.amount))),
      ),
    ];

    const unifiedTotal = unified.list.reduce(
      (total, wallet) => total + toNumber(wallet.totalEquity),
      0,
    );
    return {
      usdAmount: unifiedTotal + sumAmounts(otherPositions),
      positions: mergePositions([...unifiedPositions, ...otherPositions]),
      asOf: todayAsOf(),
    };
  }

  private async usdPrices(): Promise<UsdPrices> {
    const [binance, tickers] = await Promise.all([
      this.prices.getUsdPrices(),
      fetchJson<BybitResponse<SpotTickers>>(TICKERS_URL),
    ]);
    const bybit = new Map(
      tickers.result.list.map(({ symbol, lastPrice }) => [
        symbol,
        toNumber(lastPrice),
      ]),
    );
    return (asset) => bybit.get(`${asset}USDT`) ?? binance(asset);
  }

  private async get<T>(
    account: BybitAccount,
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    const query = new URLSearchParams(params).toString();
    const timestamp = String(Date.now());
    const signature = createHmac('sha256', account.apiSecret)
      .update(timestamp + account.apiKey + RECV_WINDOW + query)
      .digest('hex');

    const response = await fetchJson<BybitResponse<T>>(
      `${BASE_URL}${path}?${query}`,
      {
        headers: {
          'X-BAPI-API-KEY': account.apiKey,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': RECV_WINDOW,
          'X-BAPI-SIGN': signature,
        },
      },
    );
    if (response.retCode !== 0) {
      throw new Error(
        `Bybit ${path} failed with ${response.retCode}: ${response.retMsg}`,
      );
    }
    return response.result;
  }
}
