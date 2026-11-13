import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('tg_allowed_users')
export class TelegramAllowedUser {
  @PrimaryColumn({
    name: 'user_id',
    type: 'bigint',
    primaryKeyConstraintName: 'PK_tg_allowed_users',
  })
  userId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;
}
