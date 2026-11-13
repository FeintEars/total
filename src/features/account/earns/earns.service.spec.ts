import type { EarnsBalance } from './earns-balance.entity.js';
import { accruedAmount } from './earns.service.js';

function balance(amount: string, apy: string, updatedAt: string) {
  return { amount, apy, updatedAt: new Date(updatedAt) } as EarnsBalance;
}

describe('accruedAmount', () => {
  it('compounds the APY since the last update', () => {
    const value = accruedAmount(
      balance('1000', '10', '2025-01-01T00:00:00Z'),
      new Date('2027-01-01T00:00:00Z'),
    );
    expect(value).toBeCloseTo(1210, 0);
  });

  it('keeps the amount when the APY is 0 or the update is in the future', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    expect(accruedAmount(balance('5', '0', '2020-01-01T00:00:00Z'), now)).toBe(
      5,
    );
    expect(accruedAmount(balance('5', '10', '2027-01-01T00:00:00Z'), now)).toBe(
      5,
    );
  });
});
