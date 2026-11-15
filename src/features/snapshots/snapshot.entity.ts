import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Owner } from '../owner/owner.entity.js';

@Entity('snapshots')
@Index('IDX_snapshots_owner_id_created_at', ['ownerId', 'createdAt'])
export class Snapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'numeric', precision: 38, scale: 18 })
  amount: string;

  @Column({ name: 'amount_stocks', type: 'numeric', precision: 38, scale: 18 })
  amountStocks: string;

  @Column({ name: 'amount_crypto', type: 'numeric', precision: 38, scale: 18 })
  amountCrypto: string;

  @Column({ name: 'amount_inputs', type: 'numeric', precision: 38, scale: 18 })
  amountInputs: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => Owner, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'owner_id',
    foreignKeyConstraintName: 'FK_snapshots_owner',
  })
  owner?: Relation<Owner>;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
