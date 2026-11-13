import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTelegramAccess1794593340000 implements MigrationInterface {
  name = 'CreateTelegramAccess1794593340000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tg_allowed_users" (
        "user_id" bigint NOT NULL,
        "note" varchar(255),
        CONSTRAINT "PK_tg_allowed_users" PRIMARY KEY ("user_id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "tg_allowed_chats" (
        "chat_id" bigint NOT NULL,
        "note" varchar(255),
        CONSTRAINT "PK_tg_allowed_chats" PRIMARY KEY ("chat_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tg_allowed_chats"`);
    await queryRunner.query(`DROP TABLE "tg_allowed_users"`);
  }
}
