import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGithubConnections1775600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "sync_status_enum" AS ENUM (
        'pending',
        'syncing',
        'synced',
        'error',
        'revoked'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "github_connections" (
        "id"               SERIAL PRIMARY KEY,
        "project_id"       integer    NOT NULL,
        "installation_id"  text       NOT NULL,
        "repo_owner"       text       NOT NULL,
        "repo_name"        text       NOT NULL,
        "repo_id"          text       NOT NULL,
        "is_private"       boolean    NOT NULL DEFAULT false,
        "default_branch"   text       NOT NULL,
        "sync_status"      "sync_status_enum" NOT NULL DEFAULT 'pending',
        "last_synced_at"   TIMESTAMP  NULL,
        "last_commit_sha"  text       NULL,
        "last_error"       text       NULL,
        "connected_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_github_connections_project" UNIQUE ("project_id"),
        CONSTRAINT "FK_github_connections_project"
          FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "github_connections"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sync_status_enum"`);
  }
}
