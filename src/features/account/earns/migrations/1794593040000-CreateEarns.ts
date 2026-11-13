import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEarns1794593040000 implements MigrationInterface {
  name = 'CreateEarns1794593040000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "accounts_earns" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "owner_id" uuid NOT NULL,
        CONSTRAINT "PK_accounts_earns" PRIMARY KEY ("id"),
        CONSTRAINT "FK_accounts_earns_owner" FOREIGN KEY ("owner_id")
          REFERENCES "owners" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_accounts_earns_owner_id" ON "accounts_earns" ("owner_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "accounts_earns_balances" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "amount" numeric(38, 18) NOT NULL,
        "currency" varchar(16) NOT NULL,
        "apy" numeric(9, 4) NOT NULL DEFAULT 0,
        "earns_id" uuid NOT NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_accounts_earns_balances" PRIMARY KEY ("id"),
        CONSTRAINT "FK_accounts_earns_balances_earns" FOREIGN KEY ("earns_id")
          REFERENCES "accounts_earns" ("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_accounts_earns_balances_currency"
          CHECK ("currency" IN ('USDT', 'GRAM', 'SOL', 'XAUT'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_accounts_earns_balances_earns_id" ON "accounts_earns_balances" ("earns_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "accounts_earns_balances"`);
    await queryRunner.query(`DROP TABLE "accounts_earns"`);
  }
}
