import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocumentChunks1775550000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "document_chunks" (
        "id" SERIAL PRIMARY KEY,
        "document_id" integer NOT NULL,
        "project_id" integer NOT NULL,
        "job_id" integer NULL,
        "chunk_index" integer NOT NULL,
        "text" text NOT NULL,
        "source_file_name" text NOT NULL,
        "embedding" real[] NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_document_chunks_doc_idx" UNIQUE ("document_id", "chunk_index"),
        CONSTRAINT "FK_document_chunks_document" FOREIGN KEY ("document_id") REFERENCES "project_documents"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_document_chunks_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_document_chunks_job" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_document_chunks_project_job" ON "document_chunks" ("project_id", "job_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_document_chunks_project_job"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "document_chunks"`);
  }
}
