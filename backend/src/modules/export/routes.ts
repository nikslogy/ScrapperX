import { Router } from 'express';
import { ExportController } from './controllers';

const router = Router();

const exportController = new ExportController();

// Export routes
router.get('/session/:sessionId/export', exportController.exportSessionData);
router.get('/history', exportController.getExportHistory);
router.delete('/cleanup', exportController.cleanupExports);

export default router;
