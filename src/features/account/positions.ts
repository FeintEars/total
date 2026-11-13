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
