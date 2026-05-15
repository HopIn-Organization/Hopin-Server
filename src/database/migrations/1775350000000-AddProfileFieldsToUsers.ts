import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProfileFieldsToUsers1775350000000 implements MigrationInterface {
    name = 'AddProfileFieldsToUsers1775350000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "birth_date" text`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "work_experience" jsonb NOT NULL DEFAULT '[]'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "work_experience"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "birth_date"`);
    }
}
