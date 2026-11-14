export const CASH_POSITION_NAME = 'Cash';

export interface SubpositionSnapshot {
  name: string;
  quantity?: number;
  amount: number;
  currency: string;
}

export interface PositionSnapshot {
  name: string;
  quantity?: number;
  amount: number | null;
  currency: string;
  entryAmount?: number;
  payoutAmount?: number;
  subpositions?: SubpositionSnapshot[];
}

export interface AccountSnapshot {
  usdAmount: number;
  positions: PositionSnapshot[];
  asOf: string;
}

export interface AccountSnapshotSource<TAccount extends { id: string }> {
  readonly name: string;

  accountName?(account: TAccount): string;

  findByOwner(ownerId: string): Promise<TAccount[]>;

  getSnapshot(account: TAccount): Promise<AccountSnapshot>;
}

export const ACCOUNT_SNAPSHOT_SOURCES = Symbol('ACCOUNT_SNAPSHOT_SOURCES');
