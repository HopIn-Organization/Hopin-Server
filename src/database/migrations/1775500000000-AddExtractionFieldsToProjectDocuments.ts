import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExtractionFieldsToProjectDocuments1775500000000
    implements MigrationInterface
{
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "project_documents" ADD COLUMN IF NOT EXISTS "extracted_text" text NULL`,
        );
        await queryRunner.query(
            `ALTER TABLE "project_documents" ADD COLUMN IF NOT EXISTS "extraction_status" text NOT NULL DEFAULT 'pending'`,
        );
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "project_documents" DROP COLUMN IF EXISTS "extraction_status"`,
        );
        await queryRunner.query(
            `ALTER TABLE "project_documents" DROP COLUMN IF EXISTS "extracted_text"`,
        );
    }
}
