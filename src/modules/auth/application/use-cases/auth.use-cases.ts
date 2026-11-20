import { IUserRepository } from "../../domain/repositories/user.repository.interface";
import { IPasswordHasher } from "../../domain/services/password-hasher.interface";
import { ITokenService } from "../../domain/services/token-service.interface";
import {
  RegisterInputDTO,
  LoginInputDTO,
  AuthResultDTO,
} from "../dto/auth.dto";
import { SafeUser } from "../../domain/entities/user.entity";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../../../../shared/errors/AppError";

export interface AuthUseCasesConstructorParams {
  UserRepository: IUserRepository;
  PasswordHasher: IPasswordHasher;
  TokenService: ITokenService;
}

export class AuthUseCases {
  private userRepository: IUserRepository;
  private passwordHasher: IPasswordHasher;
  private tokenService: ITokenService;

  constructor({
    UserRepository,
    PasswordHasher,
    TokenService,
  }: AuthUseCasesConstructorParams) {
    this.userRepository = UserRepository;
    this.passwordHasher = PasswordHasher;
    this.tokenService = TokenService;
  }

  async register(dto: RegisterInputDTO): Promise<AuthResultDTO> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError("A user with this email address already exists");
    }

    const hashedPassword = await this.passwordHasher.hash(dto.password);

    const user = await this.userRepository.create({
      companyName: dto.companyName,
      email: dto.email,
      password: hashedPassword,
    });

    const token = this.tokenService.generateToken({
      userId: user.id,
      email: user.email,
      companyName: user.companyName,
    });

    return {
      user: user.toSafeObject(),
      token,
    };
  }

  async login(dto: LoginInputDTO): Promise<AuthResultDTO> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isMatch = await this.passwordHasher.compare(
      dto.password,
      user.password,
    );
    if (!isMatch) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const token = this.tokenService.generateToken({
      userId: user.id,
      email: user.email,
      companyName: user.companyName,
    });

    return {
      user: user.toSafeObject(),
      token,
    };
  }

  async getCurrentUser(userId: string): Promise<SafeUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user.toSafeObject();
  }
}
