import { Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { User } from '../database/entities/user.entity';
import { Skill } from '../skill/skill.entity';

export class UserRepository {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: { skills: true, projectMemberships: { project: true, job: true } }
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: { skills: true, projectMemberships: { project: true, job: true } }
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

  async updateProfile(
    id: number,
    data: {
      name: string;
      birthDate: string | null;
      workExperience: Array<{ id: string; title: string; years: number }>;
      skills: Skill[];
    }
  ): Promise<User | null> {
    await this.userRepository.update(id, {
      name: data.name,
      birthDate: data.birthDate,
      workExperience: data.workExperience,
    });

    const manager = AppDataSource.manager;
    await manager.query(`DELETE FROM user_skills WHERE user_id = $1`, [id]);
    if (data.skills.length > 0) {
      const placeholders = data.skills.map((_, i) => `($1, $${i + 2})`).join(', ');
      await manager.query(
        `INSERT INTO user_skills (user_id, skill_id) VALUES ${placeholders}`,
        [id, ...data.skills.map((s) => s.id)]
      );
    }

    return this.userRepository.findOne({ where: { id }, relations: { skills: true } });
  }
}
