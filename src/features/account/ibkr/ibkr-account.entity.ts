import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Owner } from '../../owner/owner.entity.js';

export const IBKR_DISPLAY_TYPES = ['full', 'short'] as const;
export type IbkrDisplayType = (typeof IBKR_DISPLAY_TYPES)[number];

@Entity('accounts_ibkr')
@Check(
  'CHK_accounts_ibkr_display_type',
  `"display_type" IN (${IBKR_DISPLAY_TYPES.map((t) => `'${t}'`).join(', ')})`,
)
export class IbkrAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  token: string;

  @Column({ name: 'query_id', type: 'varchar', length: 64 })
  queryId: string;

  @Column({
    name: 'display_type',
    type: 'varchar',
    length: 16,
    default: 'short',
  })
  displayType: IbkrDisplayType;

  @Index('IDX_accounts_ibkr_owner_id')
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => Owner, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'owner_id',
    foreignKeyConstraintName: 'FK_accounts_ibkr_owner',
  })
  owner?: Relation<Owner>;
}
