import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTelegramSubscriptions1794593400000 implements MigrationInterface {
  name = 'CreateTelegramSubscriptions1794593400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tg_subscriptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "chat_id" bigint NOT NULL,
        "cmd" varchar(64) NOT NULL,
        CONSTRAINT "PK_tg_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tg_subscriptions_chat_id_cmd" UNIQUE ("chat_id", "cmd")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tg_subscriptions"`);
  }
}
