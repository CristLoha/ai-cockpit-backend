import { Router } from 'express';
import { getChatHistory, getChatMessages } from '../controllers/historyController.js';
import { verifyAuthToken } from '../middleware/authMiddleware.js';



const router = Router();


router.get('/chats', verifyAuthToken, getChatHistory);
router.get('/chats/:chatId', verifyAuthToken, getChatMessages);


export default router;