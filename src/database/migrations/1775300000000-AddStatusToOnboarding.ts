import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusToOnboarding1775300000000 implements MigrationInterface {
    name = 'AddStatusToOnboarding1775300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "onboarding" ADD COLUMN "status" varchar NOT NULL DEFAULT 'pending'`
        );
        await queryRunner.query(
            `ALTER TABLE "onboarding" ADD COLUMN "failureReason" text DEFAULT NULL`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "onboarding" DROP COLUMN "failureReason"`);
        await queryRunner.query(`ALTER TABLE "onboarding" DROP COLUMN "status"`);
    }
}
