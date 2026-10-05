import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authMiddleware } from '../../common/middlewares/auth.middleware';

const router: Router = Router();

// All analytics endpoints require authentication
router.use(authMiddleware);

router.get('/overview', AnalyticsController.getOverview);

export { router as analyticsRouter };
