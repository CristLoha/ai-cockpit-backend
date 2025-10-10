import express from 'express';
import { getChatHistory, getChatMessages, deleteChat, deleteAllChats } from '../controllers/historyController.js';
import { handleContinueChat } from '../controllers/continueChatController.js';
import { verifyAuthToken } from '../middleware/authMiddleware.js';

const router = express.Router();


router.post('/chat/continue/:chatId', verifyAuthToken, handleContinueChat);


router.get('/chats', verifyAuthToken, getChatHistory);
router.get('/chats/:chatId', verifyAuthToken, getChatMessages);
router.delete('/chats/:chatId', verifyAuthToken, deleteChat);

router.delete('/chats', verifyAuthToken, deleteAllChats);


export default router;