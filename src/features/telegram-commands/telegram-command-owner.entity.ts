import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  type Relation,
} from 'typeorm';
import { Owner } from '../owner/owner.entity.js';
import { TELEGRAM_COMMAND_ALIAS_CHECK } from './telegram-command-alias.js';

@Entity('tg_cmd_owners')
@Unique('UQ_tg_cmd_owners_alias_owner_id', ['alias', 'ownerId'])
@Check('CHK_tg_cmd_owners_alias', TELEGRAM_COMMAND_ALIAS_CHECK)
export class TelegramCommandOwner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_tg_cmd_owners_alias')
  @Column({ type: 'varchar', length: 32 })
  alias: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => Owner, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'owner_id',
    foreignKeyConstraintName: 'FK_tg_cmd_owners_owner',
  })
  owner?: Relation<Owner>;
}
