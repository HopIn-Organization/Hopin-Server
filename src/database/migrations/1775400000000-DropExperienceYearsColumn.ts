import { MigrationInterface, QueryRunner } from "typeorm";

export class DropExperienceYearsColumn1775400000000 implements MigrationInterface {
    name = 'DropExperienceYearsColumn1775400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "experience_years"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "experience_years" integer`);
    }
}
