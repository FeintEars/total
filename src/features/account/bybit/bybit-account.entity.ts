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

@Entity('accounts_bybit')
export class BybitAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'api_key', type: 'text' })
  apiKey: string;

  @Column({ name: 'api_secret', type: 'text' })
  apiSecret: string;

  @Index('IDX_accounts_bybit_owner_id')
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => Owner, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'owner_id',
    foreignKeyConstraintName: 'FK_accounts_bybit_owner',
  })
  owner?: Relation<Owner>;
}
