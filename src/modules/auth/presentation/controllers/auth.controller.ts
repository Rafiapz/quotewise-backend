import { Request, Response, NextFunction, CookieOptions } from "express";
import { AuthUseCases } from "../../application/use-cases/auth.use-cases";
import {
  RegisterInputDTO,
  LoginInputDTO,
} from "../../application/dto/auth.dto";
import { config } from "../../../../config/env";
import { UnauthorizedError } from "../../../../shared/errors/AppError";

export interface AuthControllerConstructorParams {
  AuthUseCases: AuthUseCases;
  Config: typeof config;
}

export class AuthController {
  private authUseCases: AuthUseCases;
  private cookieName: string;
  private cookieOptions: CookieOptions;

  constructor({
    AuthUseCases,
    Config,
  }: AuthControllerConstructorParams) {
    this.authUseCases = AuthUseCases;
    this.cookieName = Config.COOKIE_NAME;
    this.cookieOptions = {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    };
  }

  register = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const dto = req.body as RegisterInputDTO;
      const result = await this.authUseCases.register(dto);

      res.cookie(this.cookieName, result.token, this.cookieOptions);

      res.status(201).json({
        success: true,
        message: "Registration successful",
        data: {
          user: result.user,
          token: result.token,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const dto = req.body as LoginInputDTO;
      const result = await this.authUseCases.login(dto);

      res.cookie(this.cookieName, result.token, this.cookieOptions);

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          user: result.user,
          token: result.token,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  logout = (_req: Request, res: Response): void => {
    res.clearCookie(this.cookieName, {
      httpOnly: this.cookieOptions.httpOnly,
      secure: this.cookieOptions.secure,
      sameSite: this.cookieOptions.sameSite,
      path: this.cookieOptions.path,
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  };

  me = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
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
