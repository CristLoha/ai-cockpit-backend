import admin from '../config/firebase.js';

const db = admin.firestore();
//Membatasi penggunaan untuk guest
const GUEST_USAGE_LIMIT = 5;
export const verifyAuthToken = async (req, res, next) => {

    const token = req.headers.authorization?.split('Bearer ')[1];
    if (token) {
        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            req.usuer = decodedToken;
            return next();
        } catch (error) {
            return res.status(403).send({ message: 'Token tidak valid atau kedaluwarsa.' });
        }
    }

    // Jika tidak ada token, periksa apakah pengguna adalah guest
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
        return res.status(400).send({ message: 'Akses tamu ditolak. Device ID tidak ditemukan.' });
    }

    try {
        const usageDocRef = db.collection('guestUsage').doc(deviceId);
        const usageDoc = await usageDocRef.get();

        if (!usageDoc.exists) {
            // Jika guest baru pertama kali, buat catatan & izinkan akses
            await usageDocRef.set({ count: 1, firstRequestAt: new Date() });
            return next();

        } else {
            const usageData = usageDoc.data();
            if (usageData.count < GUEST_USAGE_LIMIT) {
                // Jika masih dalam batas, perbarui hitungan dan izinkan akses
                await usageDocRef.update({ count: usageData.count + 1 });
                return next();
            } else {
                // Jika sudah mencapai batas, tolak akses
                return res.status(429).send({ message: 'Batas penggunaan tamu tercapai. Silakan Sign In untuk melanjutkan.' });
            }
        }
    } catch (error) {
        console.error("Error saat memeriksa penggunaan tamu:", error);
        return res.status(500).send({ message: 'Terjadi kesalahan di server.' });
    }
};