import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Owner } from '../../owner/owner.entity.js';
import { EarnsBalance } from './earns-balance.entity.js';

@Entity('accounts_earns')
export class Earns {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index('IDX_accounts_earns_owner_id')
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => Owner, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'owner_id',
    foreignKeyConstraintName: 'FK_accounts_earns_owner',
  })
  owner?: Relation<Owner>;

  @OneToMany(() => EarnsBalance, (balance) => balance.earns)
  balances?: Relation<EarnsBalance[]>;
}
