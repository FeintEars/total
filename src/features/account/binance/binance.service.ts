import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { fetchJson, toNumber } from '../../../shared/http/http.js';
import type {
  AccountSnapshot,
  AccountSnapshotSource,
} from '../account-snapshot.interface.js';
import { mergePositions } from '../positions.js';
import { PricesService, usdPosition } from '../prices/prices.service.js';
import { BinanceAccount } from './binance-account.entity.js';

const BASE_URL = 'https://api.binance.com';
const RECV_WINDOW = '10000';
const EARN_PAGE_SIZE = 100;

interface WalletBalance {
  walletName: string;
  activate: boolean;
  balance: string;
}

interface SpotAccount {
  balances: { asset: string; free: string; locked: string }[];
}

interface FundingAsset {
  asset: string;
  free: string;
  locked: string;
  freeze: string;
  withdrawing: string;
}

interface EarnPage<T> {
  rows: T[];
  total: number;
}

@Injectable()
export class BinanceService implements AccountSnapshotSource<BinanceAccount> {
  readonly name = 'Binance';

  constructor(
    @InjectRepository(BinanceAccount)
    private readonly accounts: Repository<BinanceAccount>,
    private readonly prices: PricesService,
  ) {}

  findByOwner(ownerId: string): Promise<BinanceAccount[]> {
    return this.accounts.findBy({ ownerId });
  }

  async getSnapshot(account: BinanceAccount): Promise<AccountSnapshot> {
    const [prices, wallets, spot, funding, flexible, locked] =
      await Promise.all([
        this.prices.getUsdPrices(),
        this.signed<WalletBalance[]>(
          account,
          'GET',
          '/sapi/v1/asset/wallet/balance',
        ),
        this.signed<SpotAccount>(account, 'GET', '/api/v3/account', {
          omitZeroBalances: 'true',
        }),
        this.signed<FundingAsset[]>(
          account,
          'POST',
          '/sapi/v1/asset/get-funding-asset',
        ),
        this.earnRows<{ asset: string; totalAmount: string }>(
          account,
          '/sapi/v1/simple-earn/flexible/position',
        ),
        this.earnRows<{ asset: string; amount: string }>(
          account,
          '/sapi/v1/simple-earn/locked/position',
        ),
      ]);

    const btcPrice = prices('BTC');
    if (btcPrice === null) {
      throw new Error('No BTC price to value the Binance wallets');
    }
    const totalBtc = wallets.reduce(
      (total, wallet) => total + toNumber(wallet.balance),
      0,
    );

    const position = (asset: string, quantity: number) =>
      usdPosition(prices, asset, quantity);
    const earnAssets = new Set(flexible.map(({ asset }) => `LD${asset}`));
    const positions = mergePositions([
      ...spot.balances
        .filter(({ asset }) => !earnAssets.has(asset))
        .map((b) => position(b.asset, toNumber(b.free) + toNumber(b.locked))),
      ...funding.map((f) =>
        position(
          f.asset,
          toNumber(f.free) +
            toNumber(f.locked) +
            toNumber(f.freeze) +
            toNumber(f.withdrawing),
        ),
      ),
      ...flexible.map((row) => position(row.asset, toNumber(row.totalAmount))),
      ...locked.map((row) => position(row.asset, toNumber(row.amount))),
    ]);

    return { usdAmount: totalBtc * btcPrice, positions };
  }

  private async earnRows<T>(account: BinanceAccount, path: string) {
    const rows: T[] = [];
    for (let current = 1; ; current++) {
      const page = await this.signed<EarnPage<T>>(account, 'GET', path, {
        current: String(current),
        size: String(EARN_PAGE_SIZE),
      });
      rows.push(...page.rows);
      if (page.rows.length < EARN_PAGE_SIZE || rows.length >= page.total) {
        return rows;
      }
    }
  }

  private signed<T>(
    account: BinanceAccount,
    method: 'GET' | 'POST',
    path: string,
    params: Record<string, string> = {},
  ): Promise<T> {
    const query = new URLSearchParams({
      ...params,
      recvWindow: RECV_WINDOW,
      timestamp: String(Date.now()),
    }).toString();
    const signature = createHmac('sha256', account.apiSecret)
      .update(query)
      .digest('hex');

    return fetchJson<T>(`${BASE_URL}${path}?${query}&signature=${signature}`, {
      method,
      headers: { 'X-MBX-APIKEY': account.apiKey },
    });
  }
}
