import { Request, Response, NextFunction } from 'express';
import { can, Permission, PolicyResource, PolicyContext } from '@taskmaster/shared';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error';

export type ContextExtractor = (req: Request) => Promise<PolicyContext> | PolicyContext;

/**
 * Server-side RBAC/ABAC middleware enforcing the central policy matrix.
 */
export const requirePermission = (
  permission: Permission,
  resource: PolicyResource,
  contextExtractor?: ContextExtractor,
) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      let context: PolicyContext | undefined;
      if (contextExtractor) {
        context = await contextExtractor(req);
      }

      const allowed = can(req.user, permission, resource, context);
      if (!allowed) {
        throw new ForbiddenError(
          `Permission denied: You do not have permission to perform '${permission}' on '${resource}'.`,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
