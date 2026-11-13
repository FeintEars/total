import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBinanceAccounts1794592920000 implements MigrationInterface {
  name = 'CreateBinanceAccounts1794592920000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "accounts_binance" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "api_key" text NOT NULL,
        "api_secret" text NOT NULL,
        "owner_id" uuid NOT NULL,
        CONSTRAINT "PK_accounts_binance" PRIMARY KEY ("id"),
        CONSTRAINT "FK_accounts_binance_owner" FOREIGN KEY ("owner_id")
          REFERENCES "owners" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_accounts_binance_owner_id" ON "accounts_binance" ("owner_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "accounts_binance"`);
  }
}
