import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKnowledgeMetaToOnboarding1775750000000
  implements MigrationInterface
{
  name = 'AddKnowledgeMetaToOnboarding1775750000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "onboarding" ADD COLUMN IF NOT EXISTS "knowledge_meta" jsonb`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "onboarding" DROP COLUMN IF EXISTS "knowledge_meta"`
    );
  }
}
