export interface SafeUser {
  id: string;
  companyName: string;
  email: string;
  createdAt: Date;
}

export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly companyName: string,
    public readonly email: string,
    public readonly password: string,
    public readonly createdAt: Date
  ) {}

  public toSafeObject(): SafeUser {
    return {
      id: this.id,
      companyName: this.companyName,
      email: this.email,
      createdAt: this.createdAt,
    };
  }
}
