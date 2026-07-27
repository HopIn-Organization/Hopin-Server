import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOnboardingTaskProjectMember1775150000000 implements MigrationInterface {
  name = 'CreateOnboardingTaskProjectMember1775150000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "onboarding" (
        "id" SERIAL PRIMARY KEY,
        "user_id" integer NOT NULL,
        "job_id" integer NOT NULL,
        "project_id" integer NOT NULL,
        CONSTRAINT "FK_onboarding_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_onboarding_job" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_onboarding_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "task" (
        "id" SERIAL PRIMARY KEY,
        "order" integer NOT NULL,
        "onboarding_id" integer,
        "title" text NOT NULL,
        "description" text NOT NULL,
        "estimated_days" integer NOT NULL,
        "is_completed" boolean NOT NULL DEFAULT false,
        "parent_id" integer,
        CONSTRAINT "FK_task_onboarding" FOREIGN KEY ("onboarding_id") REFERENCES "onboarding"("id"),
        CONSTRAINT "FK_task_parent" FOREIGN KEY ("parent_id") REFERENCES "task"("id")
      )
    `);

    await queryRunner.query(
      `CREATE TYPE "project_members_role_enum" AS ENUM ('trainee', 'admin')`
    );

    await queryRunner.query(`
      CREATE TABLE "project_members" (
        "id" SERIAL PRIMARY KEY,
        "userId" integer,
        "projectId" integer,
        "role" "project_members_role_enum" NOT NULL DEFAULT 'trainee',
        "jobId" integer NOT NULL,
        CONSTRAINT "FK_project_members_user" FOREIGN KEY ("userId") REFERENCES "users"("id"),
        CONSTRAINT "FK_project_members_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id"),
        CONSTRAINT "FK_project_members_job" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "project_members"`);
    await queryRunner.query(`DROP TYPE "project_members_role_enum"`);
    await queryRunner.query(`DROP TABLE "task"`);
    await queryRunner.query(`DROP TABLE "onboarding"`);
  }
}
