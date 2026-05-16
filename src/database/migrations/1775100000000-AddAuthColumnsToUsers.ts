import { MigrationInterface, QueryRunner } from 'typeorm';

// Auth columns (email, password_hash, refresh_token_hash, refresh_token_expires_at)
// are now part of the initial schema migration.
export class AddAuthColumnsToUsers1775100000000 implements MigrationInterface {
  name = 'AddAuthColumnsToUsers1775100000000';

  public async up(_queryRunner: QueryRunner): Promise<void> {}

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
