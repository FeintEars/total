import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBybitAccounts1794592980000 implements MigrationInterface {
  name = 'CreateBybitAccounts1794592980000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "accounts_bybit" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "api_key" text NOT NULL,
        "api_secret" text NOT NULL,
        "owner_id" uuid NOT NULL,
        CONSTRAINT "PK_accounts_bybit" PRIMARY KEY ("id"),
        CONSTRAINT "FK_accounts_bybit_owner" FOREIGN KEY ("owner_id")
          REFERENCES "owners" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_accounts_bybit_owner_id" ON "accounts_bybit" ("owner_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "accounts_bybit"`);
  }
}
