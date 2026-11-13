import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Earns } from './earns.entity.js';

export const EARNS_CURRENCIES = ['USDT', 'GRAM', 'SOL', 'XAUT'] as const;
export type EarnsCurrency = (typeof EARNS_CURRENCIES)[number];

@Entity('accounts_earns_balances')
@Check(
  'CHK_accounts_earns_balances_currency',
  `"currency" IN (${EARNS_CURRENCIES.map((c) => `'${c}'`).join(', ')})`,
)
export class EarnsBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'numeric', precision: 38, scale: 18 })
  amount: string;

  @Column({ type: 'varchar', length: 16 })
  currency: EarnsCurrency;

  @Column({ type: 'numeric', precision: 9, scale: 4, default: 0 })
  apy: string;

  @Index('IDX_accounts_earns_balances_earns_id')
  @Column({ name: 'earns_id', type: 'uuid' })
  earnsId: string;

  @ManyToOne(() => Earns, (earns) => earns.balances, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'earns_id',
    foreignKeyConstraintName: 'FK_accounts_earns_balances_earns',
  })
  earns?: Relation<Earns>;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
