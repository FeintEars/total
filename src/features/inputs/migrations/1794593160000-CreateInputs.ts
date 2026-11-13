import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInputs1794593160000 implements MigrationInterface {
  name = 'CreateInputs1794593160000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "inputs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "amount" numeric(38, 18) NOT NULL,
        "currency" varchar(16) NOT NULL,
        "owner_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inputs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inputs_owner" FOREIGN KEY ("owner_id")
          REFERENCES "owners" ("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_inputs_currency" CHECK ("currency" IN ('USD'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_inputs_owner_id" ON "inputs" ("owner_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "inputs"`);
  }
}
