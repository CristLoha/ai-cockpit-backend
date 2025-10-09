import { Router } from 'express';
import multer from 'multer';
import { handleAnalysisRequest } from '../controllers/analysisController.js';
import { handleContinueChat } from '../controllers/continueChatController.js';
import { verifyAuthToken } from '../middleware/authMiddleware.js';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    }
});

router.use(verifyAuthToken);


router.post('/analyze', upload.single('document'), handleAnalysisRequest);



router.post('/chat/continue/:chatId', handleContinueChat);


export default router;
