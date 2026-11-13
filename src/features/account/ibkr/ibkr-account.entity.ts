import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Owner } from '../../owner/owner.entity.js';

@Entity('accounts_ibkr')
export class IbkrAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  token: string;

  @Column({ name: 'query_id', type: 'varchar', length: 64 })
  queryId: string;

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
