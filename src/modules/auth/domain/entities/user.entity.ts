export interface SafeUser {
  id: string;
  companyName: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
}

export class UserEntity {
  readonly id: string;
  readonly companyName: string;
  readonly email: string;
  readonly password: string;
  readonly createdAt: Date;
  readonly isActive: boolean;

  constructor(
    id: string,
    companyName: string,
    email: string,
    password: string,
    createdAt: Date,
    isActive: boolean = true
  ) {
    this.id = id;
    this.companyName = companyName;
    this.email = email;
    this.password = password;
    this.createdAt = createdAt;
    this.isActive = isActive;
  }

  toSafeObject(): SafeUser {
    return {
      id: this.id,
      companyName: this.companyName,
      email: this.email,
      isActive: this.isActive,
      createdAt: this.createdAt,
    };
  }
}
