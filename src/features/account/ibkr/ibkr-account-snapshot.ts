import type { PositionSnapshot } from '../account-snapshot.interface.js';

export const IBKR_SOURCE_NAME = 'IBKR';

export interface IbkrAccountSnapshot {
  accountId: string;
  takenAt: string;
  totalAmount: number;
  totalCurrency: 'USD';
  positions: PositionSnapshot[];
  asOf: string;
}
