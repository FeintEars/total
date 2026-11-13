import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTelegramCommands1794593220000 implements MigrationInterface {
  name = 'CreateTelegramCommands1794593220000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tg_cmd_owners" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "alias" varchar(32) NOT NULL,
        "owner_id" uuid NOT NULL,
        CONSTRAINT "PK_tg_cmd_owners" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tg_cmd_owners_alias_owner_id" UNIQUE ("alias", "owner_id"),
        CONSTRAINT "CHK_tg_cmd_owners_alias" CHECK ("alias" ~ '^[a-z0-9_]{1,32}$'),
        CONSTRAINT "FK_tg_cmd_owners_owner" FOREIGN KEY ("owner_id")
          REFERENCES "owners" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tg_cmd_owners_alias" ON "tg_cmd_owners" ("alias")`,
    );

    await queryRunner.query(`
      CREATE TABLE "tg_cmd_accounts_ibkr" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "alias" varchar(32) NOT NULL,
        "accounts_ibkr_id" uuid NOT NULL,
        CONSTRAINT "PK_tg_cmd_accounts_ibkr" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tg_cmd_accounts_ibkr_alias_accounts_ibkr_id" UNIQUE ("alias", "accounts_ibkr_id"),
        CONSTRAINT "CHK_tg_cmd_accounts_ibkr_alias" CHECK ("alias" ~ '^[a-z0-9_]{1,32}$'),
        CONSTRAINT "FK_tg_cmd_accounts_ibkr_accounts_ibkr" FOREIGN KEY ("accounts_ibkr_id")
          REFERENCES "accounts_ibkr" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tg_cmd_accounts_ibkr_alias" ON "tg_cmd_accounts_ibkr" ("alias")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tg_cmd_accounts_ibkr"`);
    await queryRunner.query(`DROP TABLE "tg_cmd_owners"`);
  }
}
