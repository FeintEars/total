import type { OwnerSnapshot } from '../owner/owner-snapshot.js';
import {
  formatIbkrSnapshot,
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
    ],
    errors: [{ id: 'bybit-1', name: 'Bybit', message: 'Invalid <API> key' }],
    ...overrides,
  };
}

describe('formatOwnerSnapshot', () => {
  it('shows the total, P&L, every account and errors', () => {
    expect(formatOwnerSnapshot('Serhii Zubkov', ownerSnapshot())).toEqual([
      '<b>Serhii Zubkov</b> — 4,464.88 USD\nInvested 5,925.50 USD · P&amp;L −1,460.62 USD (−24.65%)',
      '<b>IBKR</b> — 2,825.02 USD\n<i>As of Nov 12, 2026 close</i>\n• Innovations — 952.37 USD\n• PLN Allocation — 960.07 PLN',
      '<b>Binance</b> — 30.72 USD\n• HBAR ×500.06 — 30.65 USD\n• PAXG ×0.00001839 — 0.07 USD',
      '⚠️ Bybit: Invalid &lt;API&gt; key',
      '<i>Nov 14, 2026, 00:44 UTC</i>',
    ]);
  });

  it('nests the positions of every sub-account inside the IBKR section for the full view', () => {
    const snapshot = ownerSnapshot({
      inputs: [],
      errors: [],
      outputs: [
        {
          id: 'ibkr-1',
          name: 'IBKR',
          amount: 952.37,
          currency: 'USD',
          asOf: '2026-11-12',
          positions: SUB_ACCOUNTS,
        },
      ],
    });

    expect(formatOwnerSnapshot('John Doe', snapshot)).toEqual([
      '<b>John Doe</b> — 4,464.88 USD',
      [
        '<b>IBKR</b> — 952.37 USD',
        '<i>As of Nov 12, 2026 close</i>',
        '• Innovations — 952.37 USD',
        '\u00a0\u00a0\u00a0◦ GOOG ×1.1 — 324.89 USD',
        '\u00a0\u00a0\u00a0◦ Cash — 85.03 EUR',
      ].join('\n'),
      '<i>Nov 14, 2026, 00:44 UTC</i>',
    ]);
  });
});

describe('formatIbkrSnapshot', () => {
  it('nests the positions under every sub-account, below the report date', () => {
    expect(
      formatIbkrSnapshot('Serhii Zubkov', {
        accountId: 'ibkr-1',
        takenAt: '2026-11-14T00:44:03.510Z',
        totalAmount: 2825.02,
        totalCurrency: 'USD',
        asOf: '2026-11-12',
        positions: SUB_ACCOUNTS,
      }),
    ).toEqual([
      [
        '<b>IBKR · Serhii Zubkov</b> — 2,825.02 USD',
        '<i>As of Nov 12, 2026 close</i>',
        '• Innovations — 952.37 USD',
        '\u00a0\u00a0\u00a0◦ GOOG ×1.1 — 324.89 USD',
        '\u00a0\u00a0\u00a0◦ Cash — 85.03 EUR',
      ].join('\n'),
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
      'Unknown command /foo.\n\nAvailable commands:\n/total — Serhii Zubkov',
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
});
