import express from 'express';
import { getChatHistory, getChatMessages, deleteChat, deleteAllChats } from '../controllers/historyController.js';
import { handleContinueChat } from '../controllers/continueChatController.js';
import { verifyAuthToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rute untuk melanjutkan chat yang sudah ada
router.post('/chat/continue/:chatId', verifyAuthToken, handleContinueChat);

// Rute untuk riwayat (history)
router.get('/chats', verifyAuthToken, getChatHistory);
router.get('/chats/:chatId', verifyAuthToken, getChatMessages);
router.delete('/chats/:chatId', verifyAuthToken, deleteChat); // Hapus per list
router.delete('/chats', verifyAuthToken, deleteAllChats); // Hapus semua

export default router;