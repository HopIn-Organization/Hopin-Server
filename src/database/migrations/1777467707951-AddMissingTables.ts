import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMissingTables1777467707951 implements MigrationInterface {
    name = 'AddMissingTables1777467707951'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_skills" DROP CONSTRAINT "FK_6926002c360291df66bb2c5fdeb"`);
        await queryRunner.query(`ALTER TABLE "job_skills" DROP CONSTRAINT "FK_7c0a3c52e77f9d9d839fdbb14b6"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_users_email"`);
        await queryRunner.query(`CREATE TYPE "public"."project_members_role_enum" AS ENUM('trainee', 'admin')`);
        await queryRunner.query(`CREATE TABLE "project_members" ("id" SERIAL NOT NULL, "role" "public"."project_members_role_enum" NOT NULL DEFAULT 'trainee', "userId" integer, "projectId" integer, "jobId" integer NOT NULL, CONSTRAINT "PK_0b2f46f804be4aea9234c78bcc9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "task" ("id" SERIAL NOT NULL, "order" integer NOT NULL, "title" text NOT NULL, "description" text NOT NULL, "estimated_days" integer NOT NULL, "is_completed" boolean NOT NULL DEFAULT false, "onboarding_id" integer, "parentId" integer, CONSTRAINT "PK_fb213f79ee45060ba925ecd576e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "onboarding" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "job_id" integer NOT NULL, "project_id" integer NOT NULL, CONSTRAINT "PK_b8b6cfe63674aaee17874f033cf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")`);
        await queryRunner.query(`ALTER TABLE "project_members" ADD CONSTRAINT "FK_08d1346ff91abba68e5a637cfdb" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_members" ADD CONSTRAINT "FK_d19892d8f03928e5bfc7313780c" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_members" ADD CONSTRAINT "FK_1179518d9156a100a92c1b4120b" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_7a835b8bcb5b781b3fed2abf9c6" FOREIGN KEY ("onboarding_id") REFERENCES "onboarding"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_8c9920b5fb32c3d8453f64b705c" FOREIGN KEY ("parentId") REFERENCES "task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "onboarding" ADD CONSTRAINT "FK_74bc0704eb2e138a5a49333490a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "onboarding" ADD CONSTRAINT "FK_cffbc85bf8fa6c70d18462042e6" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "onboarding" ADD CONSTRAINT "FK_ef4cd8111d5e42ae2ca311fc956" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_skills" ADD CONSTRAINT "FK_6926002c360291df66bb2c5fdeb" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "job_skills" ADD CONSTRAINT "FK_7c0a3c52e77f9d9d839fdbb14b6" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_skills" DROP CONSTRAINT "FK_7c0a3c52e77f9d9d839fdbb14b6"`);
        await queryRunner.query(`ALTER TABLE "user_skills" DROP CONSTRAINT "FK_6926002c360291df66bb2c5fdeb"`);
        await queryRunner.query(`ALTER TABLE "onboarding" DROP CONSTRAINT "FK_ef4cd8111d5e42ae2ca311fc956"`);
        await queryRunner.query(`ALTER TABLE "onboarding" DROP CONSTRAINT "FK_cffbc85bf8fa6c70d18462042e6"`);
        await queryRunner.query(`ALTER TABLE "onboarding" DROP CONSTRAINT "FK_74bc0704eb2e138a5a49333490a"`);
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_8c9920b5fb32c3d8453f64b705c"`);
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_7a835b8bcb5b781b3fed2abf9c6"`);
        await queryRunner.query(`ALTER TABLE "project_members" DROP CONSTRAINT "FK_1179518d9156a100a92c1b4120b"`);
        await queryRunner.query(`ALTER TABLE "project_members" DROP CONSTRAINT "FK_d19892d8f03928e5bfc7313780c"`);
        await queryRunner.query(`ALTER TABLE "project_members" DROP CONSTRAINT "FK_08d1346ff91abba68e5a637cfdb"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL`);
        await queryRunner.query(`DROP TABLE "onboarding"`);
        await queryRunner.query(`DROP TABLE "task"`);
        await queryRunner.query(`DROP TABLE "project_members"`);
        await queryRunner.query(`DROP TYPE "public"."project_members_role_enum"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_users_email" ON "users" ("email") `);
        await queryRunner.query(`ALTER TABLE "job_skills" ADD CONSTRAINT "FK_7c0a3c52e77f9d9d839fdbb14b6" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "user_skills" ADD CONSTRAINT "FK_6926002c360291df66bb2c5fdeb" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

}
