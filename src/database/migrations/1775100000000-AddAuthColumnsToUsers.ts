import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthColumnsToUsers1775100000000 implements MigrationInterface {
  name = 'AddAuthColumnsToUsers1775100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "email" text`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "password_hash" text`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "refresh_token_hash" text`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "refresh_token_expires_at" TIMESTAMPTZ`);

    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_users_email" ON "users" ("email")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_users_email"`);

    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refresh_token_expires_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refresh_token_hash"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_hash"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email"`);
  }
}
