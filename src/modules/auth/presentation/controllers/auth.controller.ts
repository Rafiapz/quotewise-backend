import { Request, Response, NextFunction, CookieOptions } from 'express';
import { AuthUseCases } from '../../application/use-cases/auth.use-cases';
import { RegisterInputDTO, LoginInputDTO } from '../../application/dto/auth.dto';
import { UnauthorizedError } from '../../../../shared/errors/AppError';

export interface CookieConfig {
  name: string;
  isProduction: boolean;
  maxAgeMs: number;
}

export class AuthController {
  private readonly cookieName: string;
  private readonly cookieOptions: CookieOptions;

  constructor(
    private readonly authUseCases: AuthUseCases,
    cookieConfig: CookieConfig
  ) {
    this.cookieName = cookieConfig.name;
    this.cookieOptions = {
      httpOnly: true,
      secure: cookieConfig.isProduction,
      sameSite: cookieConfig.isProduction ? 'none' : 'lax',
      maxAge: cookieConfig.maxAgeMs,
      path: '/',
    };
  }

  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as RegisterInputDTO;
      const result = await this.authUseCases.register(dto);

      res.cookie(this.cookieName, result.token, this.cookieOptions);

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: result.user,
          token: result.token,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as LoginInputDTO;
      const result = await this.authUseCases.login(dto);

      res.cookie(this.cookieName, result.token, this.cookieOptions);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          token: result.token,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public logout = (_req: Request, res: Response): void => {
    res.clearCookie(this.cookieName, {
      httpOnly: this.cookieOptions.httpOnly,
      secure: this.cookieOptions.secure,
      sameSite: this.cookieOptions.sameSite,
      path: this.cookieOptions.path,
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  };

  public me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const user = await this.authUseCases.getCurrentUser(req.user.userId);

      res.status(200).json({
        success: true,
        data: {
          user,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
