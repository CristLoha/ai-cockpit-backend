import admin from '../config/firebase.js';
const db = admin.firestore();

/**
 * Helper function to delete a collection in batches.
 * @param {FirebaseFirestore.CollectionReference} collectionRef
 * @param {number} batchSize
 */
async function deleteCollection(collectionRef, batchSize) {
    const query = collectionRef.limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, resolve).catch(reject);
    });

    async function deleteQueryBatch(query, resolve) {
        const snapshot = await query.get();

        if (snapshot.size === 0) {
            return resolve();
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        process.nextTick(() => deleteQueryBatch(query, resolve));
    }
}

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

export const deleteChat = async (req, res) => {
    try {
        const userId = req.user.uid;
        const { chatId } = req.params;

        console.log(`[History] Memulai penghapusan chat: ${chatId} untuk user: ${userId}`);

        const chatDocRef = db.collection('users').doc(userId).collection('chats').doc(chatId);
        const messagesCollectionRef = chatDocRef.collection('messages');

        // Delete all messages in the subcollection first
        await deleteCollection(messagesCollectionRef, 100);
        console.log(`[History] Sub-koleksi 'messages' untuk chat ${chatId} berhasil dihapus.`);

        // Then delete the chat document itself
        await chatDocRef.delete();
        console.log(`[History] Dokumen chat ${chatId} berhasil dihapus.`);

        res.status(200).json({ message: `Chat dengan ID ${chatId} berhasil dihapus.` });
    } catch (error) {
        console.error('Error deleting chat:', error);
        res.status(500).json({ message: 'Gagal menghapus percakapan.' });
    }
};

export const deleteAllChats = async (req, res) => {
    try {
        const userId = req.user.uid;
        console.log(`[History] Memulai penghapusan SEMUA chat untuk user: ${userId}`);

        const chatsCollectionRef = db.collection('users').doc(userId).collection('chats');
        
        // This helper will handle deleting subcollections for each chat document.
        await deleteCollection(chatsCollectionRef, 100);

        res.status(200).json({ message: 'Semua riwayat percakapan berhasil dihapus.' });
    } catch (error) {
        console.error('Error deleting all chats:', error);
        res.status(500).json({ message: 'Gagal menghapus semua riwayat percakapan.' });
    }
};
