import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompletedAtToTask1775660000000 implements MigrationInterface {
  name = 'AddCompletedAtToTask1775660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task" ADD COLUMN "completed_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "completed_at"`);
  }
}
