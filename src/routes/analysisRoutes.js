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


const handleUploadErrors = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ message: `Ukuran file melebihi batas maksimal ${MAX_FILE_SIZE / 1024 / 1024} MB.` });
        }
        return res.status(400).json({ message: `Error upload file: ${err.message}` });
    } else if (err) {
        return res.status(500).json({ message: 'Terjadi kesalahan pada server saat mengunggah file.' });
    }
    next();
};

router.post('/analyze', verifyAuthToken, upload.single('document'), handleUploadErrors, handleAnalysisRequest);
router.post('/chat/continue/:chatId', verifyAuthToken, handleContinueChat);

export default router;
