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
      relations: ['skills']
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['skills']
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }
}