import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Owner } from '../owner/owner.entity.js';

export const INPUTS_CURRENCIES = ['USD'] as const;
export type InputsCurrency = (typeof INPUTS_CURRENCIES)[number];

@Entity('inputs')
@Check(
  'CHK_inputs_currency',
  `"currency" IN (${INPUTS_CURRENCIES.map((c) => `'${c}'`).join(', ')})`,
)
export class Input {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'numeric', precision: 38, scale: 18 })
  amount: string;

  @Column({ type: 'varchar', length: 16 })
  currency: InputsCurrency;

  @Index('IDX_inputs_owner_id')
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => Owner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id', foreignKeyConstraintName: 'FK_inputs_owner' })
  owner?: Relation<Owner>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
