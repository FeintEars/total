import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('tg_subscriptions')
@Unique('UQ_tg_subscriptions_chat_id_cmd', ['chatId', 'cmd'])
export class TelegramSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'chat_id', type: 'bigint' })
  chatId: string;

  @Column({ type: 'varchar', length: 64 })
  cmd: string;
}
