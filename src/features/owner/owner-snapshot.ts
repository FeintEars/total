import type { PositionSnapshot } from '../account/account-snapshot.interface.js';

export interface InputSnapshot {
  name: string;
  amount: number;
  currency: string;
  createdAt: string;
}

export interface OutputSnapshot {
  id: string;
  name: string;
  amount: number;
  currency: 'USD';
  positions: PositionSnapshot[];
  asOf: string;
}

export interface OutputSnapshotError {
  id: string;
  name: string;
  message: string;
}

export interface OwnerSnapshot {
  ownerId: string;
  takenAt: string;
  totalAmount: number;
  totalCurrency: 'USD';
  inputs: InputSnapshot[];
  outputs: OutputSnapshot[];
  errors: OutputSnapshotError[];
}
