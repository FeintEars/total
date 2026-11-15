import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MergeTelegramAllowedUsers1794593460000 implements MigrationInterface {
  name = 'MergeTelegramAllowedUsers1794593460000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "tg_allowed_chats" ("chat_id", "note")
      SELECT "user_id", "note" FROM "tg_allowed_users"
      ON CONFLICT ("chat_id") DO NOTHING
    `);
    await queryRunner.query(`DROP TABLE "tg_allowed_users"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tg_allowed_users" (
        "user_id" bigint NOT NULL,
        "note" varchar(255),
        CONSTRAINT "PK_tg_allowed_users" PRIMARY KEY ("user_id")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "tg_allowed_users" ("user_id", "note")
      SELECT "chat_id", "note" FROM "tg_allowed_chats" WHERE "chat_id" > 0
    `);
    await queryRunner.query(
      `DELETE FROM "tg_allowed_chats" WHERE "chat_id" > 0`,
    );
  }
}
