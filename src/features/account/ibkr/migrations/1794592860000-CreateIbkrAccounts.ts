import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIbkrAccounts1794592860000 implements MigrationInterface {
  name = 'CreateIbkrAccounts1794592860000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "accounts_ibkr" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "token" text NOT NULL,
        "query_id" varchar(64) NOT NULL,
        "owner_id" uuid NOT NULL,
        CONSTRAINT "PK_accounts_ibkr" PRIMARY KEY ("id"),
        CONSTRAINT "FK_accounts_ibkr_owner" FOREIGN KEY ("owner_id")
          REFERENCES "owners" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_accounts_ibkr_owner_id" ON "accounts_ibkr" ("owner_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "accounts_ibkr"`);
  }
}
