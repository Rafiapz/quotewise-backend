import { PrismaClient } from '@prisma/client';
import { IUserRepository, CreateUserData } from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findByEmail(email: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!record) {
      return null;
    }

    return new UserEntity(
      record.id,
      record.companyName,
      record.email,
      record.password,
      record.createdAt
    );
  }

  public async findById(id: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!record) {
      return null;
    }

    return new UserEntity(
      record.id,
      record.companyName,
      record.email,
      record.password,
      record.createdAt
    );
  }

  public async create(data: CreateUserData): Promise<UserEntity> {
    const record = await this.prisma.user.create({
      data: {
        companyName: data.companyName.trim(),
        email: data.email.toLowerCase().trim(),
        password: data.password,
      },
    });

    return new UserEntity(
      record.id,
      record.companyName,
      record.email,
      record.password,
      record.createdAt
    );
  }
}
