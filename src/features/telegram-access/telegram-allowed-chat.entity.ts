import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('tg_allowed_chats')
export class TelegramAllowedChat {
  @PrimaryColumn({
    name: 'chat_id',
    type: 'bigint',
    primaryKeyConstraintName: 'PK_tg_allowed_chats',
  })
  chatId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;
}
