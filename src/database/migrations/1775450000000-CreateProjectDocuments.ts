import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProjectDocuments1775450000000 implements MigrationInterface {
    name = 'CreateProjectDocuments1775450000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "project_documents" (
                "id"            SERIAL              NOT NULL,
                "original_name" text                NOT NULL,
                "s3_key"        text                NOT NULL,
                "mime_type"     text                NOT NULL,
                "size_bytes"    integer             NOT NULL,
                "project_id"    integer             NOT NULL,
                "job_id"        integer,
                "uploaded_at"   TIMESTAMPTZ         NOT NULL DEFAULT now(),
                CONSTRAINT "PK_project_documents" PRIMARY KEY ("id"),
                CONSTRAINT "FK_project_documents_project"
                    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_project_documents_job"
                    FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "project_documents"`);
    }
}
