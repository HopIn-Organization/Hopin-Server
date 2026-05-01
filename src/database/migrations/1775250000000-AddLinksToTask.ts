import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLinksToTask1775250000000 implements MigrationInterface {
  name = 'AddLinksToTask1775250000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "task"
      ADD COLUMN "links" text[] NOT NULL DEFAULT '{}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "task"
      DROP COLUMN "links"
    `);
  }
}
