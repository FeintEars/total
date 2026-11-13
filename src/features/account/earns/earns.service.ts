import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { toNumber } from '../../../shared/http/http.js';
import type {
  AccountSnapshot,
  AccountSnapshotSource,
} from '../account-snapshot.interface.js';
import { byAmountDesc, sumAmounts, todayAsOf } from '../positions.js';
import { PricesService, usdPosition } from '../prices/prices.service.js';
import type { EarnsBalance } from './earns-balance.entity.js';
import { Earns } from './earns.entity.js';

const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;

@Injectable()
export class EarnsService implements AccountSnapshotSource<Earns> {
  readonly name = 'Earns';

  constructor(
    @InjectRepository(Earns)
    private readonly earns: Repository<Earns>,
    private readonly prices: PricesService,
  ) {}

  accountName(earns: Earns): string {
    return earns.name;
  }

  findByOwner(ownerId: string): Promise<Earns[]> {
    return this.earns.find({
      where: { ownerId },
      relations: { balances: true },
    });
  }

  async getSnapshot(earns: Earns, now = new Date()): Promise<AccountSnapshot> {
    const prices = await this.prices.getUsdPrices();
    const positions = (earns.balances ?? [])
      .map((balance) =>
        usdPosition(
          prices,
          balance.currency,
          accruedAmount(balance, now),
          balance.name,
        ),
      )
      .sort(byAmountDesc);

    return { usdAmount: sumAmounts(positions), positions, asOf: todayAsOf() };
  }
}

export function accruedAmount(balance: EarnsBalance, now: Date): number {
  const years = Math.max(
    0,
    (now.getTime() - balance.updatedAt.getTime()) / MS_PER_YEAR,
  );
  const apy = toNumber(balance.apy) / 100;
  return toNumber(balance.amount) * (1 + apy) ** years;
}
