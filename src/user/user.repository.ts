import { Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { User } from '../database/entities/user.entity';

export class UserRepository {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: [
        'skills',
        'projectMemberships',
        'projectMemberships.project',
        'projectMemberships.jobs',
      ]
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: [
        'skills',
        'projectMemberships',
        'projectMemberships.project',
        'projectMemberships.jobs',
      ]
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .addSelect('user.refreshTokenHash')
      .addSelect('user.refreshTokenExpiresAt')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findByIdWithAuthFields(id: number): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .addSelect('user.refreshTokenHash')
      .addSelect('user.refreshTokenExpiresAt')
      .where('user.id = :id', { id })
      .getOne();
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async storeRefreshToken(userId: number, refreshTokenHash: string, refreshTokenExpiresAt: Date): Promise<void> {
    await this.userRepository.update(userId, {
      refreshTokenHash,
      refreshTokenExpiresAt,
    });
  }

  async clearRefreshToken(userId: number): Promise<void> {
    await this.userRepository.update(userId, {
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    });
  }
}
