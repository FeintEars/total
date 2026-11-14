import { fetchJson } from '../../../shared/http/http.js';
import { PolymarketService } from './polymarket.service.js';

vi.mock('../../../shared/http/http.js', () => ({ fetchJson: vi.fn() }));

const ADDRESS = '0x1111111111111111111111111111111111111111';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

function balance(usd: number) {
  return { result: `0x${BigInt(Math.round(usd * 1e6)).toString(16)}` };
}

function service() {
  return new PolymarketService(
    {} as never,
    { polygonRpcUrl: 'https://rpc.example' } as never,
  );
}

describe('PolymarketService.getSnapshot', () => {
  beforeEach(() => {
    vi.mocked(fetchJson).mockImplementation(async (url, init) => {
      const target = String(url);
      if (target.includes('/v2/value')) {
        return { data: { value: 61.5 } };
      }
      if (target.includes('/v2/positions')) {
        return {
          data: [
            {
              title: 'Small',
              outcome: 'No',
              current_size: 10,
              current_value: 4,
              entry_cost_usdc: 5,
            },
            {
              title: 'Big',
              outcome: 'Yes',
              current_size: 125.5,
              current_value: 57.5,
              entry_cost_usdc: 52.71,
            },
            {
              title: 'Lost',
              outcome: 'Yes',
              current_size: 20,
              current_value: 0,
              entry_cost_usdc: 8,
            },
          ],
          pagination: { next_cursor: null },
        };
      }
      const { params } = JSON.parse(init?.body as string) as {
        params: [{ to: string }];
      };
      return balance(params[0].to === USDC_E ? 30 : 70.25);
    });
  });

  it('gives every open outcome its entry, current and winning amounts, then one cash line', async () => {
    const snapshot = await service().getSnapshot({
      address: ADDRESS,
    } as never);

    expect(snapshot.usdAmount).toBeCloseTo(161.75);
    expect(snapshot.positions).toEqual([
      {
        name: 'Big — Yes',
        amount: 57.5,
        currency: 'USD',
        entryAmount: 52.71,
        payoutAmount: 125.5,
      },
      {
        name: 'Small — No',
        amount: 4,
        currency: 'USD',
        entryAmount: 5,
        payoutAmount: 10,
      },
      { name: 'Cash', amount: 100.25, currency: 'USD' },
    ]);
  });

  it('leaves cash out when the wallet holds none', async () => {
    vi.mocked(fetchJson).mockImplementation(async (url) =>
      String(url).includes('/v2/value')
        ? { data: { value: 0 } }
        : String(url).includes('/v2/positions')
          ? { data: [], pagination: { next_cursor: null } }
          : balance(0),
    );

    const snapshot = await service().getSnapshot({
      address: ADDRESS,
    } as never);

    expect(snapshot.positions).toEqual([]);
    expect(snapshot.usdAmount).toBe(0);
  });
});
