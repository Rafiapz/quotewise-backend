import { Router, RequestHandler } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../../../../shared/middleware/validateRequest';
import { registerBodySchema, loginBodySchema } from '../validators/auth.validator';

export const createAuthRouter = (
  authController: AuthController,
  authMiddleware: RequestHandler
): Router => {
  const router = Router();

  // Registration endpoints (both /register and /signup aliases)
  router.post(
    '/register',
    validateRequest({ body: registerBodySchema }),
    authController.register
  );
  router.post(
    '/signup',
    validateRequest({ body: registerBodySchema }),
    authController.register
  );

  // Login endpoints (both /login and /signin aliases)
  router.post(
    '/login',
    validateRequest({ body: loginBodySchema }),
    authController.login
  );
  router.post(
    '/signin',
    validateRequest({ body: loginBodySchema }),
    authController.login
  );

  // Logout endpoint (clears auth cookie)
  router.post('/logout', authController.logout);

  // Get current authenticated user profile
  router.get('/me', authMiddleware, authController.me);

  return router;
};
