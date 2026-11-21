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

  constructor({
    AuthUseCases,
    Config,
  }: AuthControllerConstructorParams) {
    this.authUseCases = AuthUseCases;
    this.cookieName = Config.COOKIE_NAME;
  }

  private getCookieOptions(req: Request): CookieOptions {
    const isHttps =
      req.secure ||
      req.headers["x-forwarded-proto"] === "https" ||
      process.env.NODE_ENV === "production";

    return {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? "none" : "lax",
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

      res.cookie(this.cookieName, result.token, this.getCookieOptions(req));

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

      res.cookie(this.cookieName, result.token, this.getCookieOptions(req));

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

  logout = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const cookieOptions = this.getCookieOptions(req);
      res.clearCookie(this.cookieName, {
        httpOnly: cookieOptions.httpOnly,
        secure: cookieOptions.secure,
        sameSite: cookieOptions.sameSite,
        path: cookieOptions.path,
      });

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      next(error);
    }
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
