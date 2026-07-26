import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreatedAtToOnboarding1775650000000 implements MigrationInterface {
  name = 'AddCreatedAtToOnboarding1775650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "onboarding" ADD COLUMN "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "onboarding" DROP COLUMN "created_at"`
    );
  }
}
