import { Router } from 'express';
import { getChatHistory, getChatMessages } from '../controllers/historyController.js';
import { verifyAuthToken } from '../middleware/authMiddleware.js';



const router = Router();

router.use(verifyAuthToken);

// Rute untuk mendapatkan DAFTAR SEMUA riwayat analisis (untuk halaman "Perpustakaan")
router.get('/chats', getChatHistory);

router.get('/chats/:chatId', getChatMessages);


export default router;