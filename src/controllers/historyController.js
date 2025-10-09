import admin from '../config/firebase.js';
const db = admin.firestore();


export const getChatHistory = async (req, res) => {
    try {
        const userId = req.user.uid;
        console.log(`[History] Mengambil riwayat untuk userId: ${userId}`);

        const chatsSnapshot = await db.collection('users').doc(userId).collection('chats').orderBy('createdAt', 'desc').get();

        console.log(`[History] Ditemukan ${chatsSnapshot.size} dokumen.`);

        if (chatsSnapshot.empty) {
            console.log('[History] Tidak ada riwayat, mengembalikan array kosong.');
            return res.json([]);

        }
        const history = chatsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,

                createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            };
        });
        console.log('[History] Berhasil memetakan data riwayat. Mengirim respons...');
        res.json(history);
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ message: 'Gagal mengambil riwayat percakapan.' });
    }
};

export const getChatMessages = async (req, res) => {
    try {
        const userId = req.user.uid;
        const { chatId } = req.params;
        const chatDocRef = db.collection('users').doc(userId).collection('chats').doc(chatId);
        const chatDoc = await chatDocRef.get();
        if (!chatDoc.exists) {
            return res.status(404).json({ message: "Chat tidak ditemukan." });
        }
        const analysisData = chatDoc.data();

        if (analysisData.createdAt && analysisData.createdAt.toDate) {
            analysisData.createdAt = analysisData.createdAt.toDate().toISOString();
        }
        const messagesSnapshot = await chatDocRef.collection('messages').orderBy('timestamp', 'asc').get();

        const messages = messagesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,

                timestamp: data.timestamp && data.timestamp.toDate
                    ? data.timestamp.toDate().toISOString()
                    : new Date().toISOString(),
            };
        });

        res.json({
            analysis: analysisData,

            messages: messages
        });

    } catch (error) {
        console.error("Error mengambil pesan chat:", error);
        res.status(500).json({ message: "Gagal mengambil pesan chat." });
    }
};
