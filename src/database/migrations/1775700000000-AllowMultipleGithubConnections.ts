import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowMultipleGithubConnections1775700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotent: dev databases run with DB_SYNCHRONIZE=true, so the old
    // unique constraint/index may already be gone (or carry a TypeORM-generated
    // name) and the composite unique may already exist.
    await queryRunner.query(`
      ALTER TABLE "github_connections"
        DROP CONSTRAINT IF EXISTS "UQ_github_connections_project"
    `);

    // Drop any leftover unique index on (project_id) alone, whatever its name
    await queryRunner.query(`
      DO $$
      DECLARE idx record;
      BEGIN
        FOR idx IN
          SELECT i.indexrelid::regclass AS name
          FROM pg_index i
          JOIN pg_class t ON t.oid = i.indrelid
          WHERE t.relname = 'github_connections'
            AND i.indisunique AND NOT i.indisprimary
            AND i.indnatts = 1
            AND (SELECT attname FROM pg_attribute
                 WHERE attrelid = t.oid AND attnum = i.indkey[0]) = 'project_id'
        LOOP
          EXECUTE format('DROP INDEX %s', idx.name);
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_index i
          JOIN pg_class t ON t.oid = i.indrelid
          WHERE t.relname = 'github_connections'
            AND i.indisunique
            AND i.indnatts = 2
            AND (SELECT attname FROM pg_attribute
                 WHERE attrelid = t.oid AND attnum = i.indkey[0]) = 'project_id'
            AND (SELECT attname FROM pg_attribute
                 WHERE attrelid = t.oid AND attnum = i.indkey[1]) = 'repo_id'
        ) THEN
          ALTER TABLE "github_connections"
            ADD CONSTRAINT "UQ_github_connections_project_repo" UNIQUE ("project_id", "repo_id");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Lossy: restoring the one-connection-per-project constraint requires
    // dropping all but the oldest connection of each project.
    await queryRunner.query(`
      DELETE FROM "github_connections" gc
        USING "github_connections" older
        WHERE gc."project_id" = older."project_id" AND gc."id" > older."id"
    `);

    await queryRunner.query(`
      ALTER TABLE "github_connections"
        DROP CONSTRAINT IF EXISTS "UQ_github_connections_project_repo"
    `);

    await queryRunner.query(`
      ALTER TABLE "github_connections"
        ADD CONSTRAINT "UQ_github_connections_project" UNIQUE ("project_id")
    `);
  }
}
