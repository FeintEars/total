import type { PositionSnapshot } from './account-snapshot.interface.js';

export function sumAmounts(positions: PositionSnapshot[]): number {
  return positions.reduce((total, { amount }) => total + (amount ?? 0), 0);
}

export function mergePositions(
  positions: PositionSnapshot[],
): PositionSnapshot[] {
  const merged = new Map<string, PositionSnapshot>();
  for (const position of positions) {
    const key = `${position.name}\u0000${position.currency}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...position });
      continue;
    }
    existing.quantity = (existing.quantity ?? 0) + (position.quantity ?? 0);
    existing.amount =
      existing.amount === null || position.amount === null
        ? null
        : existing.amount + position.amount;
  }
  return [...merged.values()]
    .filter(({ quantity }) => quantity !== 0)
    .sort(byAmountDesc);
}

export function byAmountDesc(a: PositionSnapshot, b: PositionSnapshot): number {
  return (b.amount ?? 0) - (a.amount ?? 0);
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function roundPositions(
  positions: PositionSnapshot[],
): PositionSnapshot[] {
  return positions.map((position) => ({
    ...position,
    amount: position.amount === null ? null : roundMoney(position.amount),
    ...(position.entryAmount !== undefined && {
      entryAmount: roundMoney(position.entryAmount),
    }),
    ...(position.payoutAmount !== undefined && {
      payoutAmount: roundMoney(position.payoutAmount),
    }),
    ...(position.subpositions && {
      subpositions: position.subpositions.map((subposition) => ({
        ...subposition,
        amount: roundMoney(subposition.amount),
      })),
    }),
  }));
}

export function todayAsOf(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
