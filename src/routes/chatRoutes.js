import { Router } from 'express';
import multer from 'multer';
import { handleChatRequest } from '../controllers/chatController.js';
import { verifyAuthToken } from '../middleware/authMiddleware.js';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        // Membatasi ukuran file hingga 10MB
        fileSize: 5 * 1024 * 1024,

    }

});


router.post('/chat', verifyAuthToken, upload.array('documents', 5), handleChatRequest);

export default router;