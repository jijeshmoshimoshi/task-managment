import { Router } from 'express';
import { auditController } from './audit.controller';
import { authenticate } from '../../common/middlewares/auth.middleware';
import { requirePermission } from '../../common/middlewares/rbac.middleware';
import { PERMISSIONS } from '@taskmaster/shared';

const router: Router = Router();

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.ORG_AUDIT_VIEW, 'audit'),
  auditController.getLogs,
);

router.get(
  '/export',
  authenticate,
  requirePermission(PERMISSIONS.ORG_AUDIT_EXPORT, 'audit'),
  auditController.exportCsv,
);

export const auditRouter: Router = router;

