import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSnapshots1794593520000 implements MigrationInterface {
  name = 'CreateSnapshots1794593520000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "snapshots" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "amount" numeric(38, 18) NOT NULL,
        "amount_stocks" numeric(38, 18) NOT NULL,
        "amount_crypto" numeric(38, 18) NOT NULL,
        "amount_inputs" numeric(38, 18) NOT NULL,
        "owner_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_snapshots" PRIMARY KEY ("id"),
        CONSTRAINT "FK_snapshots_owner" FOREIGN KEY ("owner_id")
          REFERENCES "owners" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_snapshots_owner_id_created_at" ON "snapshots" ("owner_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "snapshots"`);
  }
}
