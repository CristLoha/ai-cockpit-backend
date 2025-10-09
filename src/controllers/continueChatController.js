import admin from '../config/firebase.js';
import { generateAiResponse } from '../services/geminiService.js';

const db = admin.firestore();

export const handleContinueChat = async (req, res) => {
    const { userQuestion } = req.body;
    const { chatId } = req.params;
    const userId = req.user.uid;

    try {
        if (!userQuestion || !chatId) {
            return res.status(400).json({ message: 'Pertanyaan dan ID Chat dibutuhkan.' });
        }

        const chatDocRef = db.collection('users').doc(userId).collection('chats').doc(chatId);
        const messagesCollectionRef = chatDocRef.collection('messages');


        await messagesCollectionRef.add({
            sender: 'user', text: userQuestion, timestamp: new Date()
        });


        const messagesSnapshot = await messagesCollectionRef.orderBy('timestamp', 'desc').limit(10).get();
        const history = messagesSnapshot.docs.map(doc => doc.data()).reverse();
        const historyText = history.map(msg => `${msg.sender}: ${msg.text}`).join('\n');

        let masterPrompt = '';

        if (history.length === 1) {
            const chatDoc = await chatDocRef.get();
            const analysisData = chatDoc.data();

            const analysisContext = `
            Judul Dokumen: "${analysisData.title}".
            Rangkuman: "${analysisData.summary}".
            Poin-Poin Kunci: ${analysisData.keyPoints.join('; ')}.
            Kata Kunci: ${analysisData.keywords.join(', ')}.`;
            masterPrompt = `Kamu adalah asisten AI yang ahli dalam menganalisis jurnal. Jawab pertanyaan pengguna berdasarkan konteks dokumen yang telah dianalisis berikut. Jawabanmu harus singkat, padat, dan relevan. Konteks: """${analysisContext}""" Pertanyaan Pengguna: "${userQuestion}"`;
        } else {

            masterPrompt = `Lanjutkan percakapan ini dan jawab pertanyaan terakhir pengguna berdasarkan konteks riwayat sebelumnya. Riwayat: """${historyText}""" Pertanyaan Baru: "${userQuestion}"`;
        }


        const aiTextResponse = await generateAiResponse(masterPrompt);


        await messagesCollectionRef.add({
            sender: 'ai', text: aiTextResponse, timestamp: new Date()
        });

        res.json({ status: 'success', answer: aiTextResponse, chatId: chatId });

    } catch (error) {
        console.error("Continue Chat Error:", error);
        res.status(500).json({ status: 'error', message: 'Gagal melanjutkan percakapan.' });
    }
};