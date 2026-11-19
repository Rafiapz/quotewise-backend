import { UserEntity } from '../entities/user.entity';

export interface CreateUserData {
  companyName: string;
  email: string;
  password: string;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  create(data: CreateUserData): Promise<UserEntity>;
}
