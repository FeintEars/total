import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIbkrDisplayType1794593280000 implements MigrationInterface {
  name = 'AddIbkrDisplayType1794593280000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "accounts_ibkr"
        ADD "display_type" varchar(16) NOT NULL DEFAULT 'short',
        ADD CONSTRAINT "CHK_accounts_ibkr_display_type"
          CHECK ("display_type" IN ('full', 'short'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "accounts_ibkr"
        DROP CONSTRAINT "CHK_accounts_ibkr_display_type",
        DROP COLUMN "display_type"
    `);
  }
}
