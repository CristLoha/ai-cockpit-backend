import admin from 'firebase-admin';

// Hanya inisialisasi jika belum ada aplikasi yang berjalan
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Lingkungan produksi (Vercel)
      console.log('[Firebase] Initializing from environment variable...');
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      // Lingkungan lokal (menggunakan file)
      console.log('[Firebase] Initializing from local service account file...');
      // Ganti `assert` dengan `with` untuk Node.js v20+
      const { default: serviceAccount } = await import('./serviceAccountKey.json', {
        with: { type: 'json' }
      });
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
  } catch (error) {
    console.error('Firebase Admin SDK initialization failed:', error);
  }
}


export default admin;