import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePolymarketAccounts1794593100000 implements MigrationInterface {
  name = 'CreatePolymarketAccounts1794593100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "accounts_polymarket" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "address" varchar(42) NOT NULL,
        "owner_id" uuid NOT NULL,
        CONSTRAINT "PK_accounts_polymarket" PRIMARY KEY ("id"),
        CONSTRAINT "FK_accounts_polymarket_owner" FOREIGN KEY ("owner_id")
          REFERENCES "owners" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_accounts_polymarket_owner_id" ON "accounts_polymarket" ("owner_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "accounts_polymarket"`);
  }
}
