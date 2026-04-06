import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectUsers1775000000001 implements MigrationInterface {
  name = 'AddProjectUsers1775000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "project_users" (
        "id" SERIAL PRIMARY KEY,
        "project_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "role" text NOT NULL DEFAULT 'trainee',
        CONSTRAINT "UQ_project_users_project_user" UNIQUE ("project_id", "user_id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_project_users_project_id" ON "project_users" ("project_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_project_users_user_id" ON "project_users" ("user_id")`);

    await queryRunner.query(`
      ALTER TABLE "project_users"
      ADD CONSTRAINT "FK_project_users_project"
      FOREIGN KEY ("project_id") REFERENCES "projects"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "project_users"
      ADD CONSTRAINT "FK_project_users_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "project_users" DROP CONSTRAINT "FK_project_users_user"`);
    await queryRunner.query(`ALTER TABLE "project_users" DROP CONSTRAINT "FK_project_users_project"`);
    await queryRunner.query(`DROP INDEX "IDX_project_users_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_project_users_project_id"`);
    await queryRunner.query(`DROP TABLE "project_users"`);
  }
}
