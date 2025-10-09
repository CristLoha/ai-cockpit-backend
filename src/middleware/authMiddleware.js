import admin from '../config/firebase.js';

const db = admin.firestore();
const GUEST_USAGE_LIMIT = 5;

export const verifyAuthToken = async (req, res, next) => {
    // --- TAMBAHKAN KODE MATA-MATA DI SINI ---
    console.log("===================================");
    console.log("INCOMING HEADERS ON VERCEL:", req.headers);
    console.log("===================================");
    // --- AKHIR KODE MATA-MATA ---

    const token = req.headers.authorization?.split('Bearer ')[1];
    if (token) {
        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            req.user = decodedToken;
            return next(); // Jika token valid, user lolos dan fungsi berhenti di sini.
        } catch (error) {
            // Jika token TIDAK valid, kirim error dan fungsi berhenti di sini.
            console.error("TOKEN VERIFICATION FAILED:", error);
            return res.status(403).send({ message: 'Token tidak valid atau kedaluwarsa.' });
        }
    }

    // Kode di bawah ini HANYA akan berjalan jika TIDAK ADA token sama sekali.
    const deviceId = req.headers['x-device-id'];
    if (deviceId) {
        try {
            const usageDoc = await db.collection('guestUsage').doc(deviceId).get();
            if (usageDoc.exists && usageDoc.data().count >= GUEST_USAGE_LIMIT) {
                return res.status(429).send({ message: 'Batas penggunaan tamu tercapai. Silakan Sign In untuk melanjutkan.' });
            }

            req.user = { uid: deviceId, isGuest: true };
            return next();
        } catch (error) {
            console.error("Error saat memeriksa penggunaan tamu:", error);
            return res.status(500).send({ message: 'Terjadi kesalahan di server.' });
        }
    }

    return res.status(401).send({ message: 'Akses ditolak. Token atau Device ID tidak ditemukan.' });
};