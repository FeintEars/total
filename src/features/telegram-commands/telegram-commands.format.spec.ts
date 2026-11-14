import type { OwnerSnapshot } from '../owner/owner-snapshot.js';
import {
  formatIbkrBalance,
  formatIbkrSnapshot,
  formatOwnerBalance,
  formatOwnerSnapshot,
  formatQuantity,
  formatUnknownCommand,
  splitMessage,
} from './telegram-commands.format.js';

const SUB_ACCOUNTS = [
  {
    name: 'Innovations',
    amount: 952.37,
    currency: 'USD',
    subpositions: [
      { name: 'GOOG', quantity: 1.1, amount: 324.89, currency: 'USD' },
      { name: 'Cash', amount: 85.03, currency: 'EUR' },
    ],
  },
];

function ownerSnapshot(overrides: Partial<OwnerSnapshot> = {}): OwnerSnapshot {
  return {
    ownerId: 'owner-1',
    takenAt: '2026-11-14T00:44:03.510Z',
    totalAmount: 4464.88,
    totalCurrency: 'USD',
    inputs: [
      {
        name: 'Stocks',
        amount: 5925.5,
        currency: 'USD',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    outputs: [
      {
        id: 'ibkr-1',
        source: 'IBKR',
        name: 'IBKR',
        amount: 2825.02,
        currency: 'USD',
        asOf: '2026-11-12',
        positions: [
          { name: 'Innovations', amount: 952.37, currency: 'USD' },
          { name: 'PLN Allocation', amount: 960.07, currency: 'PLN' },
        ],
      },
      {
        id: 'binance-1',
        source: 'Binance',
        name: 'Binance',
        amount: 30.72,
        currency: 'USD',
        asOf: '2026-11-14',
        positions: [
          {
            name: 'HBAR',
            quantity: 500.06144355,
            amount: 30.65,
            currency: 'USD',
          },
          { name: 'PAXG', quantity: 0.00001839, amount: 0.07, currency: 'USD' },
        ],
      },
      {
        id: 'earns-1',
        source: 'Earns',
        name: 'Telegram Wallet',
        amount: 0,
        currency: 'USD',
        asOf: '2026-11-14',
        positions: [],
      },
    ],
    errors: [{ id: 'bybit-1', name: 'Bybit', message: 'Invalid <API> key' }],
    ...overrides,
  };
}

describe('formatOwnerSnapshot', () => {
  it('shows the total, P&L, every account and errors', () => {
    expect(formatOwnerSnapshot('Serhii Zubkov', ownerSnapshot())).toEqual([
      [
        '💼 <b>Serhii Zubkov</b>',
        '━━━━━━━━━━━━━━━━━━',
        '💰 <b>4,464.88 USD</b>',
        '📥 Invested 5,925.50 USD',
        '🔴 P&amp;L −1,460.62 USD (−24.65%)',
      ].join('\n'),
      [
        '🏦 <b>IBKR</b> — 2,825.02 USD',
        '<i>As of Nov 12, 2026 close</i>',
        '<blockquote expandable>Innovations — 952.37 USD',
        'PLN Allocation — 960.07 PLN</blockquote>',
      ].join('\n'),
      [
        '🟡 <b>Binance</b> — 30.72 USD',
        '<blockquote expandable>HBAR ×500.06 — 30.65 USD',
        'PAXG ×0.00001839 — 0.07 USD</blockquote>',
      ].join('\n'),
      '🌱 <b>Telegram Wallet</b> — 0.00 USD',
      '⚠️ Bybit: Invalid &lt;API&gt; key',
      '🕐 <i>Nov 14, 2026, 00:44 UTC</i>',
    ]);
  });

  it('marks a P&L in profit green', () => {
    const [header] = formatOwnerSnapshot(
      'Serhii Zubkov',
      ownerSnapshot({ totalAmount: 6000 }),
    );

    expect(header.split('\n').at(-1)).toBe('🟢 P&amp;L +74.50 USD (+1.26%)');
  });

  it('nests the positions of every sub-account inside the IBKR section for the full view', () => {
    const snapshot = ownerSnapshot({
      inputs: [],
      errors: [],
      outputs: [
        {
          id: 'ibkr-1',
          source: 'IBKR',
          name: 'IBKR',
          amount: 952.37,
          currency: 'USD',
          asOf: '2026-11-12',
          positions: [
            ...SUB_ACCOUNTS,
            {
              name: 'PLN Allocation',
              amount: 960.07,
              currency: 'PLN',
              subpositions: [],
            },
          ],
        },
      ],
    });

    expect(formatOwnerSnapshot('John Doe', snapshot)).toEqual([
      '💼 <b>John Doe</b>\n━━━━━━━━━━━━━━━━━━\n💰 <b>4,464.88 USD</b>',
      [
        '🏦 <b>IBKR</b> — 952.37 USD',
        '<i>As of Nov 12, 2026 close</i>',
        '<blockquote expandable>▸ Innovations — 952.37 USD',
        '\u00a0\u00a0\u00a0\u00a0GOOG ×1.1 — 324.89 USD',
        '\u00a0\u00a0\u00a0\u00a0💵 Cash — 85.03 EUR',
        '',
        '▸ PLN Allocation — 960.07 PLN</blockquote>',
      ].join('\n'),
      '🕐 <i>Nov 14, 2026, 00:44 UTC</i>',
    ]);
  });
});

describe('formatOwnerSnapshot for Polymarket', () => {
  it('shows entry, current and winning amounts per outcome, then cash', () => {
    const snapshot = ownerSnapshot({
      inputs: [],
      errors: [],
      outputs: [
        {
          id: 'polymarket-1',
          source: 'Polymarket',
          name: 'Polymarket',
          amount: 161.5,
          currency: 'USD',
          asOf: '2026-11-14',
          positions: [
            {
              name: 'Will <X> happen? — Yes',
              amount: 61.5,
              currency: 'USD',
              entryAmount: 52.71,
              payoutAmount: 125.5,
            },
            { name: 'Cash', amount: 100, currency: 'USD' },
          ],
        },
      ],
    });

    expect(formatOwnerSnapshot('John Doe', snapshot)[1]).toBe(
      [
        '🎯 <b>Polymarket</b> — 161.50 USD',
        '<blockquote expandable>Will &lt;X&gt; happen? — Yes',
        '\u00a0\u00a0\u00a0\u00a0Entry 52.71 USD · Now 61.50 USD · Win 125.50 USD',
        '',
        '💵 Cash — 100.00 USD</blockquote>',
      ].join('\n'),
    );
  });
});

describe('formatOwnerBalance', () => {
  it('shows only the total and names the accounts left out of it', () => {
    expect(formatOwnerBalance(ownerSnapshot())).toBe(
      '4,464.88 USD\n⚠️ Not included: Bybit',
    );
  });

  it('is a single line when every account answered', () => {
    expect(formatOwnerBalance(ownerSnapshot({ errors: [] }))).toBe(
      '4,464.88 USD',
    );
  });
});

describe('formatIbkrBalance', () => {
  it('shows only the account total', () => {
    expect(
      formatIbkrBalance({
        accountId: 'ibkr-1',
        takenAt: '2026-11-14T00:44:03.510Z',
        totalAmount: 2825.02,
        totalCurrency: 'USD',
        asOf: '2026-11-12',
        positions: SUB_ACCOUNTS,
      }),
    ).toBe('2,825.02 USD');
  });
});

describe('formatIbkrSnapshot', () => {
  it('shows a header, then every sub-account as its own tree', () => {
    expect(
      formatIbkrSnapshot('Serhii Zubkov', {
        accountId: 'ibkr-1',
        takenAt: '2026-11-14T00:44:03.510Z',
        totalAmount: 2825.02,
        totalCurrency: 'USD',
        asOf: '2026-11-12',
        positions: [
          ...SUB_ACCOUNTS,
          {
            name: 'PLN Allocation',
            amount: 960.07,
            currency: 'PLN',
            subpositions: [
              { name: 'CDR', quantity: 2, amount: 644.74, currency: 'PLN' },
              { name: 'Cash', amount: 315.33, currency: 'PLN' },
            ],
          },
          { name: 'Empty', amount: 0, currency: 'USD', subpositions: [] },
        ],
      }),
    ).toEqual([
      [
        '🏦 <b>IBKR · Serhii Zubkov</b>',
        '━━━━━━━━━━━━━━━━━━',
        '💰 <b>2,825.02 USD</b>',
        '📅 <i>As of Nov 12, 2026 close</i>',
      ].join('\n'),
      [
        '📂 <b>Innovations</b> — 952.37 USD',
        '├ GOOG ×1.1 — 324.89 USD',
        '└ 💵 Cash — 85.03 EUR',
      ].join('\n'),
      [
        '📂 <b>PLN Allocation</b> — 960.07 PLN',
        '├ CDR ×2 — 644.74 PLN',
        '└ 💵 Cash — 315.33 PLN',
      ].join('\n'),
      '📂 <b>Empty</b> — 0.00 USD',
    ]);
  });
});

describe('formatUnknownCommand', () => {
  it('lists the available commands', () => {
    expect(
      formatUnknownCommand('foo', [
        { alias: 'total', description: 'Serhii Zubkov' },
      ]),
    ).toBe(
      'Unknown command /foo.\n\nAvailable commands:\n/total — Serhii Zubkov\n\nAdd balance for the USD total only: /total balance',
    );
  });
});

describe('formatQuantity', () => {
  it('keeps five significant digits without losing whole units', () => {
    expect(formatQuantity(671.32230081)).toBe('671.32');
    expect(formatQuantity(0.10196528)).toBe('0.10197');
    expect(formatQuantity(12345.678)).toBe('12,346');
    expect(formatQuantity(-2)).toBe('−2');
  });
});

describe('splitMessage', () => {
  it('packs whole blocks into messages under the limit', () => {
    expect(splitMessage(['aaaa', 'bbbb', 'cccc'], 10)).toEqual([
      'aaaa\n\nbbbb',
      'cccc',
    ]);
  });

  it('splits a block that alone exceeds the limit by lines', () => {
    expect(splitMessage(['111\n222\n333'], 7)).toEqual(['111\n222', '333']);
  });

  it('closes and reopens a collapsed quote that is split across messages', () => {
    const [a, b, c] = ['a', 'b', 'c'].map((letter) => letter.repeat(30));
    const quote = (text: string) =>
      `<blockquote expandable>${text}</blockquote>`;

    expect(
      splitMessage(
        [`Header\n<blockquote expandable>${a}\n${b}\n${c}</blockquote>`],
        100,
      ),
    ).toEqual([`Header\n${quote(a)}`, quote(b), quote(c)]);
  });
});
