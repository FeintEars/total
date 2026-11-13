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
import { IbkrAccount } from '../account/ibkr/ibkr-account.entity.js';
import { TELEGRAM_COMMAND_ALIAS_CHECK } from './telegram-command-alias.js';

@Entity('tg_cmd_accounts_ibkr')
@Unique('UQ_tg_cmd_accounts_ibkr_alias_accounts_ibkr_id', [
  'alias',
  'ibkrAccountId',
])
@Check('CHK_tg_cmd_accounts_ibkr_alias', TELEGRAM_COMMAND_ALIAS_CHECK)
export class TelegramCommandIbkrAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_tg_cmd_accounts_ibkr_alias')
  @Column({ type: 'varchar', length: 32 })
  alias: string;

  @Column({ name: 'accounts_ibkr_id', type: 'uuid' })
  ibkrAccountId: string;

  @ManyToOne(() => IbkrAccount, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'accounts_ibkr_id',
    foreignKeyConstraintName: 'FK_tg_cmd_accounts_ibkr_accounts_ibkr',
  })
  ibkrAccount?: Relation<IbkrAccount>;
}
