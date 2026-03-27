import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInitialSchema1774535239827 implements MigrationInterface {
    name = 'CreateInitialSchema1774535239827'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "projects" (
                "id" SERIAL PRIMARY KEY,
                "name" text NOT NULL,
                "description" text
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "jobs" (
                "id" SERIAL PRIMARY KEY,
                "title" text NOT NULL,
                "project_id" integer
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "skills" (
                "id" SERIAL PRIMARY KEY,
                "name" text NOT NULL
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_skills_name" ON "skills" ("name")`);

        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" SERIAL PRIMARY KEY,
                "name" text NOT NULL,
                "experience_years" integer
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "job_skills" (
                "job_id" integer NOT NULL,
                "skill_id" integer NOT NULL,
                CONSTRAINT "PK_cc853451c17c3913492abc1e6e6" PRIMARY KEY ("job_id", "skill_id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_4f7427e13d249156f37669e712" ON "job_skills" ("job_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_7c0a3c52e77f9d9d839fdbb14b" ON "job_skills" ("skill_id")`);

        await queryRunner.query(`
            CREATE TABLE "user_skills" (
                "user_id" integer NOT NULL,
                "skill_id" integer NOT NULL,
                CONSTRAINT "PK_816eba68a0ca1b837ec15daefc7" PRIMARY KEY ("user_id", "skill_id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_6926002c360291df66bb2c5fde" ON "user_skills" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_eb69710b0a00f42fb95fc2ac2f" ON "user_skills" ("skill_id")`);

        await queryRunner.query(`
            ALTER TABLE "jobs"
            ADD CONSTRAINT "FK_570051510a95166a699cd7dafd5"
            FOREIGN KEY ("project_id") REFERENCES "projects"("id")
            ON DELETE SET NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "job_skills"
            ADD CONSTRAINT "FK_4f7427e13d249156f37669e7127"
            FOREIGN KEY ("job_id") REFERENCES "jobs"("id")
            ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "job_skills"
            ADD CONSTRAINT "FK_7c0a3c52e77f9d9d839fdbb14b6"
            FOREIGN KEY ("skill_id") REFERENCES "skills"("id")
            ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "user_skills"
            ADD CONSTRAINT "FK_6926002c360291df66bb2c5fdeb"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "user_skills"
            ADD CONSTRAINT "FK_eb69710b0a00f42fb95fc2ac2f5"
            FOREIGN KEY ("skill_id") REFERENCES "skills"("id")
            ON DELETE CASCADE ON UPDATE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_skills" DROP CONSTRAINT "FK_eb69710b0a00f42fb95fc2ac2f5"`);
        await queryRunner.query(`ALTER TABLE "user_skills" DROP CONSTRAINT "FK_6926002c360291df66bb2c5fdeb"`);
        await queryRunner.query(`ALTER TABLE "job_skills" DROP CONSTRAINT "FK_7c0a3c52e77f9d9d839fdbb14b6"`);
        await queryRunner.query(`ALTER TABLE "job_skills" DROP CONSTRAINT "FK_4f7427e13d249156f37669e7127"`);
        await queryRunner.query(`ALTER TABLE "jobs" DROP CONSTRAINT "FK_570051510a95166a699cd7dafd5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eb69710b0a00f42fb95fc2ac2f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6926002c360291df66bb2c5fde"`);
        await queryRunner.query(`DROP TABLE "user_skills"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7c0a3c52e77f9d9d839fdbb14b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4f7427e13d249156f37669e712"`);
        await queryRunner.query(`DROP TABLE "job_skills"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."uq_skills_name"`);
        await queryRunner.query(`DROP TABLE "skills"`);
        await queryRunner.query(`DROP TABLE "jobs"`);
        await queryRunner.query(`DROP TABLE "projects"`);
    }

}
