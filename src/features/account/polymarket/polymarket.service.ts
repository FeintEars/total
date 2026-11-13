import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { fetchJson } from '../../../shared/http/http.js';
import type {
  AccountSnapshot,
  AccountSnapshotSource,
  PositionSnapshot,
} from '../account-snapshot.interface.js';
import { byAmountDesc, sumAmounts } from '../positions.js';
import { PolymarketAccount } from './polymarket-account.entity.js';
import polymarketConfig from './polymarket.config.js';

const DATA_API_URL = 'https://data-api.polymarket.com/v2';
const POSITIONS_PAGE_SIZE = 500;
const MAX_POSITIONS_PAGES = 20;

const COLLATERAL_TOKENS = [
  { name: 'USDC.e', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
  { name: 'pUSD', address: '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB' },
] as const;
const COLLATERAL_DECIMALS = 6;
const BALANCE_OF_SELECTOR = '0x70a08231';

interface PositionsPage {
  data: {
    title: string;
    outcome: string;
    current_size: number;
    current_value: number;
  }[];
  pagination: { next_cursor: string | null };
}

@Injectable()
export class PolymarketService implements AccountSnapshotSource<PolymarketAccount> {
  readonly name = 'Polymarket';

  constructor(
    @InjectRepository(PolymarketAccount)
    private readonly accounts: Repository<PolymarketAccount>,
    @Inject(polymarketConfig.KEY)
    private readonly config: ConfigType<typeof polymarketConfig>,
  ) {}

  findByOwner(ownerId: string): Promise<PolymarketAccount[]> {
    return this.accounts.findBy({ ownerId });
  }

  async getSnapshot(account: PolymarketAccount): Promise<AccountSnapshot> {
    const user = account.address.toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(user)) {
      throw new Error(`Not a wallet address: ${account.address}`);
    }

    const [value, positions, cash] = await Promise.all([
      fetchJson<{ data: { value: number } }>(
        `${DATA_API_URL}/value?user=${user}`,
      ),
      this.positions(user),
      Promise.all(
        COLLATERAL_TOKENS.map(async (token) => {
          const quantity = await this.tokenBalance(token.address, user);
          return {
            name: token.name,
            quantity,
            amount: quantity,
            currency: 'USD',
          };
        }),
      ),
    ]);

    const cashPositions = cash.filter(({ quantity }) => quantity > 0);
    return {
      usdAmount: value.data.value + sumAmounts(cashPositions),
      positions: [...positions.sort(byAmountDesc), ...cashPositions],
    };
  }

  private async positions(user: string): Promise<PositionSnapshot[]> {
    const positions: PositionSnapshot[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < MAX_POSITIONS_PAGES; page++) {
      const query = new URLSearchParams({ user });
      if (cursor) {
        query.set('cursor', cursor);
      } else {
        query.set('limit', String(POSITIONS_PAGE_SIZE));
      }
      const { data, pagination }: PositionsPage =
        await fetchJson<PositionsPage>(`${DATA_API_URL}/positions?${query}`);

      positions.push(
        ...data
          .filter((p) => p.current_value > 0)
          .map((p) => ({
            name: `${p.title} — ${p.outcome}`,
            quantity: p.current_size,
            amount: p.current_value,
            currency: 'USD',
          })),
      );
      cursor = pagination.next_cursor;
      if (!cursor) {
        return positions;
      }
    }
    throw new Error(
      `More than ${MAX_POSITIONS_PAGES * POSITIONS_PAGE_SIZE} Polymarket positions`,
    );
  }

  private async tokenBalance(token: string, owner: string): Promise<number> {
    const response = await fetchJson<{
      result?: string;
      error?: { message: string };
    }>(this.config.polygonRpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          {
            to: token,
            data: BALANCE_OF_SELECTOR + owner.slice(2).padStart(64, '0'),
          },
          'latest',
        ],
      }),
    });
    if (response.error || !response.result) {
      throw new Error(
        `Polygon RPC balanceOf failed: ${response.error?.message ?? 'no result'}`,
      );
    }
    return Number(BigInt(response.result)) / 10 ** COLLATERAL_DECIMALS;
  }
}
