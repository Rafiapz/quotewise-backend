import { SafeUser } from '../../domain/entities/user.entity';

export interface RegisterInputDTO {
  companyName: string;
  email: string;
  password: string;
}

export interface LoginInputDTO {
  email: string;
  password: string;
}

export interface AuthResultDTO {
  user: SafeUser;
  token: string;
}
