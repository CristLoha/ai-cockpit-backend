import { Router } from 'express';
import multer from 'multer';
import { handleAnalysisRequest } from '../controllers/analysisController.js';
import { handleContinueChat } from '../controllers/continueChatController.js';
import { verifyAuthToken } from '../middleware/authMiddleware.js';
import { MAX_FILE_SIZE } from '../config/constants.js';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_FILE_SIZE,
    }
});


router.post('/analyze', verifyAuthToken, upload.single('document'), handleAnalysisRequest);
router.post('/chat/continue/:chatId', verifyAuthToken, handleContinueChat);

export default router;
