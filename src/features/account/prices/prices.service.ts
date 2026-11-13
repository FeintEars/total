import { Injectable } from '@nestjs/common';
import { fetchJson, toNumber } from '../../../shared/http/http.js';
import type { PositionSnapshot } from '../account-snapshot.interface.js';

const TICKER_URL = 'https://api.binance.com/api/v3/ticker/price';
const CACHE_TTL_MS = 30_000;
const USD_PEGGED = new Set(['USD', 'USDT']);

export type UsdPrices = (asset: string) => number | null;

@Injectable()
export class PricesService {
  private cache?: { expiresAt: number; prices: Promise<Map<string, number>> };

  async getUsdPrices(): Promise<UsdPrices> {
    const prices = await this.loadTicker();
    return (asset) => {
      const symbol = asset.toUpperCase();
      if (USD_PEGGED.has(symbol)) {
        return 1;
      }
      return prices.get(`${symbol}USDT`) ?? null;
    };
  }

  private loadTicker(): Promise<Map<string, number>> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.prices;
    }

    const prices = fetchJson<{ symbol: string; price: string }[]>(
      TICKER_URL,
    ).then(
      (tickers) =>
        new Map(tickers.map(({ symbol, price }) => [symbol, toNumber(price)])),
    );
    this.cache = { expiresAt: Date.now() + CACHE_TTL_MS, prices };
    prices.catch(() => {
      this.cache = undefined;
    });
    return prices;
  }
}

export function usdValue(
  prices: UsdPrices,
  asset: string,
  quantity: number,
): number | null {
  const price = prices(asset);
  return price === null ? null : price * quantity;
}

export function usdPosition(
  prices: UsdPrices,
  asset: string,
  quantity: number,
  name = asset,
): PositionSnapshot {
  return {
    name,
    quantity,
    amount: usdValue(prices, asset, quantity),
    currency: 'USD',
  };
}
