import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOwners1794592800000 implements MigrationInterface {
  name = 'CreateOwners1794592800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "owners" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        CONSTRAINT "PK_owners" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "owners"`);
  }
}
